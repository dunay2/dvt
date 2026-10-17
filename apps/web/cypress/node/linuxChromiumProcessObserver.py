"""Owned concern: observe one native Cypress tree with bounded Linux diagnostics."""
import errno
import json
import os
from pathlib import Path
import selectors
import signal
import socket
import struct
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from linuxChromiumProcessProtocol import (OwnedProcesses, classify_arguments,
    decode_kernel_record, decode_process_events, parse_birthtime)
from linuxChromiumSignalTrace import SignalTrace, generator_snapshot
from linuxChromiumOomJournal import OomJournal


def emit(record):
    if "timestampNs" in record:
        record = {**record, "timestampNs": str(record["timestampNs"])}
    print(json.dumps(record, separators=(",", ":")), flush=True)


def subscription(stream, operation):
    stream.send(struct.pack("=IHHIIIIIIHHI", 40, 3, 0, 1, os.getpid(),
                            1, 1, 1, 0, 4, 0, operation))


def await_event(stream, predicate):
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        stream.settimeout(max(0.001, deadline - time.monotonic()))
        for event in decode_process_events(stream.recv(65536)):
            if predicate(event):
                return event
    raise TimeoutError("Process capability was not observed")


def prove_connector(stream):
    if os.stat("/proc/self/ns/time").st_ino != os.stat("/proc/1/ns/time").st_ino:
        raise ValueError("Process timestamp namespace mismatch")
    subscription(stream, 1)
    acknowledgement = await_event(stream, lambda event: event["kind"] == 0)
    if acknowledgement["ackError"] != 0:
        raise OSError(acknowledgement["ackError"], "Process subscription denied")
    started_ns = time.monotonic_ns()
    probe = subprocess.Popen([sys.executable, "-I", "-B", "-c", "raise SystemExit(23)"],
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                             stderr=subprocess.DEVNULL, env={"PATH": "/usr/bin:/bin"})
    try:
        observed = await_event(stream, lambda event: event["kind"] == 0x80000000
                               and event["pid"] == probe.pid and event["tid"] == probe.pid)
        if (observed["waitStatus"] != 23 << 8 or probe.wait(timeout=3) != 23
                or not started_ns <= observed["timestampNs"] <= time.monotonic_ns()):
            raise ValueError("Process capability exit mismatch")
    finally:
        if probe.poll() is None:
            probe.kill()
        probe.wait()


def identity(pid, capture_root):
    try:
        directory = Path("/proc") / str(pid)
        before = parse_birthtime((directory / "stat").read_text())
        executable = os.readlink(directory / "exe")
        with (directory / "cmdline").open("rb") as source:
            role = classify_arguments(source.read(131072), capture_root, executable)
        same_executable = executable == os.readlink(directory / "exe")
        after = parse_birthtime((directory / "stat").read_text())
        return (before, role, time.monotonic_ns()) if before == after and same_executable else None
    except (OSError, ValueError):
        return None


class Observation:
    def __init__(self, root_pid, capture_root):
        self.ledger = OwnedProcesses(root_pid)
        self.capture_root = capture_root
        self.cpu_sequences = {}
        self.kernel_sequence = None
        self.incomplete = False
        self.killed_network_pids = set()
        self.signal_targets = set()

    def gap(self, source, reason):
        self.incomplete = True
        emit({"kind": "coverage-gap", "source": source, "reason": reason})

    def refresh_identities(self):
        for pid, lifetime in self.ledger.processes.items():
            if lifetime["endedNs"] is None:
                observed = identity(pid, self.capture_root)
                if observed is not None:
                    self.ledger.identify(pid, *observed)

    def processes(self, packet):
        for event in decode_process_events(packet):
            cpu = event["cpu"]
            previous = self.cpu_sequences.get(cpu)
            if previous is not None and event["sequence"] != (previous + 1) & 0xffffffff:
                self.gap("process-events", "sequence-gap")
            self.cpu_sequences[cpu] = event["sequence"]
            if event["kind"] == 0:
                continue
            if event["kind"] == 1:
                if event["pid"] == event["tid"]:
                    self.ledger.fork(event["parentPid"], event["pid"], event["timestampNs"])
                else:
                    self.ledger.thread(event["pid"], event["tid"])
            elif event["kind"] == 0x80000000:
                projected = self.ledger.exit(event)
                if projected is not None:
                    emit(projected)
                    if (projected["role"] == "network-service" and projected.get("signal") == 9
                            and projected["pid"] == projected["tid"]):
                        self.killed_network_pids.add(projected["pid"])

    def kernel(self, packet):
        event = decode_kernel_record(packet)
        if self.kernel_sequence is not None and event["sequence"] != self.kernel_sequence + 1:
            self.gap("kernel-oom", "sequence-gap")
        self.kernel_sequence = event["sequence"]
        projected = self.ledger.oom(event)
        if projected is not None:
            emit(projected)

    def signals(self, events):
        for event in events:
            candidate = self.ledger.candidate_process_pid(event["targetTid"])
            if candidate is not None:
                self.signal_targets.add(candidate)
                emit({**event, "kind": "signal-generation", "correlation": "pid-only",
                      "targetProcessCandidatePid": candidate,
                      **generator_snapshot(event["generatorTid"])})

    def finish(self):
        roles = self.ledger.observed_roles(time.monotonic_ns())
        if "browser" not in roles:
            self.gap("process-events", "browser-not-observed")
        elif "network-service" not in roles:
            self.gap("process-events", "network-service-not-observed")
        if self.killed_network_pids - self.signal_targets:
            self.gap("signal-generation", "signal-not-observed")
        emit({"kind": "complete", "incomplete": self.incomplete})
        return 1 if self.incomplete else 0


def observe(stream, kernel, root_pid, capture_root, trace, journal):
    observation = Observation(root_pid, capture_root)
    stream.setblocking(False)
    with selectors.DefaultSelector() as selection:
        selection.register(stream, selectors.EVENT_READ, "process-events")
        selection.register(kernel, selectors.EVENT_READ, "kernel-oom")
        selection.register(trace.fd, selectors.EVENT_READ, "signal-generation")
        selection.register(sys.stdin, selectors.EVENT_READ, "lifetime")
        emit({"kind": "ready", "rootPid": root_pid})
        finished = False
        last_identity_refresh = 0
        while not finished:
            for key, _ in selection.select(0.05):
                if key.data == "lifetime":
                    if sys.stdin.buffer.read(1) != b"":
                        raise ValueError("Unexpected observer input")
                    finished = True
                    continue
                try:
                    if key.data == "process-events":
                        observation.processes(stream.recv(65536))
                    elif key.data == "signal-generation":
                        observation.signals(trace.read())
                    else:
                        observation.kernel(os.read(kernel, 65536))
                except OSError as error:
                    if error.errno not in (errno.ENOBUFS, errno.EPIPE, errno.EAGAIN):
                        raise
                    if error.errno != errno.EAGAIN:
                        observation.gap(key.data, "records-lost")
            if time.monotonic() - last_identity_refresh >= 0.05:
                observation.refresh_identities()
                last_identity_refresh = time.monotonic()
        # The parent closes stdin only after native Cypress completion. Drain
        # already queued exits before closing the observer's own sources.
        for source, read, receive in [("process-events", lambda: stream.recv(65536), observation.processes),
                                      ("kernel-oom", lambda: os.read(kernel, 65536), observation.kernel)]:
            for _ in range(1024):
                try:
                    receive(read())
                except BlockingIOError:
                    break
                except OSError:
                    observation.gap(source, "records-lost")
                    break
            else:
                observation.gap(source, "drain-limit")
        try:
            observation.signals(trace.finish())
        except (OSError, ValueError):
            observation.gap("signal-generation", "records-lost")
        try:
            for record in journal.finish(observation.ledger.owns_candidate):
                emit(record)
        except (OSError, ValueError, subprocess.SubprocessError):
            observation.gap("userspace-oom", "records-lost")
        return observation.finish()


def cancel_observer(_signal, _frame):
    raise InterruptedError("Observer cancelled")


def main():
    source = "process-events"
    kernel = None
    try:
        root_pid = int(sys.argv[1])
        capture_root = Path(sys.argv[2])
        if root_pid < 1 or not capture_root.is_absolute() or not capture_root.is_dir():
            raise ValueError("Invalid observer ownership")
        with socket.socket(socket.AF_NETLINK, socket.SOCK_DGRAM, 11) as stream:
            try:
                stream.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 1024 * 1024)
                stream.bind((os.getpid(), 1))
                prove_connector(stream)
                source = "kernel-oom"
                kernel = os.open("/dev/kmsg", os.O_RDONLY | os.O_NONBLOCK)
                os.lseek(kernel, 0, os.SEEK_END)
                source = "signal-generation"
                with SignalTrace() as trace:
                    source = "userspace-oom"
                    journal = OomJournal()
                    source = "observation"
                    return observe(stream, kernel, root_pid, str(capture_root), trace, journal)
            finally:
                if kernel is not None:
                    os.close(kernel)
                subscription(stream, 2)
    except (OSError, ValueError, IndexError, subprocess.SubprocessError):
        emit({"kind": "unavailable", "source": source})
        return 1


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, cancel_observer)
    sys.exit(main())
