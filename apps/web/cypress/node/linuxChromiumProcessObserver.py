"""Owned concern: observe one native Cypress tree with bounded Linux diagnostics."""
import errno
import ctypes
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
import stat

sys.path.insert(0, str(Path(__file__).resolve().parent))
from linuxChromiumProcessProtocol import (OwnedProcesses, classify_arguments,
    decode_kernel_record, decode_process_events, parse_birthtime, validate_lease,
    validate_trace_receipt, exact_keys)
from linuxChromiumSignalTrace import SignalTrace, generator_snapshot, dispose_owned_trace
from linuxChromiumOomJournal import OomJournal


def emit(record):
    if "timestampNs" in record:
        record = {**record, "timestampNs": str(record["timestampNs"])}
    print(json.dumps(record, separators=(",", ":")), flush=True)


def read_private_input():
    line = sys.stdin.buffer.readline(8193)
    if len(line) > 8192 or not line.endswith(b"\n"):
        raise ValueError("Invalid private observer input")
    return json.loads(line)


def process_identity(pid):
    fields = (Path("/proc") / str(pid) / "stat").read_text().rsplit(")", 1)[1].split()
    return {"birthtimeTicks": fields[19], "parentPid": int(fields[1]),
            "processGroupId": int(fields[2]), "sessionId": int(fields[3])}


def validate_controller(lease):
    controller = lease["controller"]
    if process_identity(controller["pid"])["birthtimeTicks"] != controller["birthtimeTicks"]:
        raise ValueError("Stale observer controller")
    descriptor = os.open(lease["capture"]["path"], os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        identity = os.fstat(descriptor)
        if (str(identity.st_dev) != lease["capture"]["device"]
                or str(identity.st_ino) != lease["capture"]["inode"]
                or identity.st_uid != os.stat(Path("/proc") / str(controller["pid"])).st_uid):
            raise ValueError("Foreign observer capture")
    finally:
        os.close(descriptor)


def duplicate_reference(lease):
    phase = "bootstrap"
    try:
        validate_controller(lease)
        phase = "descriptor-duplication"
        controller = lease["controller"]
        pidfd = os.pidfd_open(controller["pid"], 0)
        try:
            if process_identity(controller["pid"])["birthtimeTicks"] != controller["birthtimeTicks"]:
                raise ValueError("Reused observer controller")
            libc = ctypes.CDLL(None, use_errno=True)
            duplicate = libc.pidfd_getfd
            duplicate.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint]
            duplicate.restype = ctypes.c_int
            descriptor = duplicate(pidfd, lease["leaderProcReference"]["ownerFd"], 0)
            if descriptor < 0:
                raise OSError(ctypes.get_errno(), "Owned descriptor duplication denied")
        finally:
            os.close(pidfd)
        try:
            identity = os.fstat(descriptor)
            reference = lease["leaderProcReference"]
            if (not stat.S_ISDIR(identity.st_mode) or str(identity.st_dev) != reference["device"]
                    or str(identity.st_ino) != reference["inode"]):
                raise ValueError("Foreign pinned observer descriptor")
            return descriptor
        except BaseException:
            os.close(descriptor)
            raise
    except (OSError, ValueError, IndexError, AttributeError, TypeError) as error:
        error.observer_phase = phase
        raise


def control(request):
    phase = "protocol"
    descriptor = None
    try:
        action = request.get("action") if isinstance(request, dict) else None
        fields = ("action", "lease", "signal") if action == "signal-owned-group" else ("action", "lease", "trace")
        exact_keys(request, fields)
        lease = validate_lease(request["lease"])
        phase = "descriptor-duplication"
        descriptor = duplicate_reference(lease)
        if action == "signal-owned-group":
            phase = "protocol"
            requested = request["signal"]
            if type(requested) is not int or requested not in (0, signal.SIGTERM, signal.SIGKILL):
                raise ValueError("Unadmitted observer signal")
            phase = "group-signal"
            try:
                signal.pidfd_send_signal(descriptor, requested, None, 1 << 2)
                return {"state": "alive"}
            except ProcessLookupError:
                # Only ESRCH from this kernel operation proves group retirement.
                return {"state": "gone"}
        if action != "dispose-owned-trace":
            phase = "protocol"
            raise ValueError("Unadmitted observer control")
        phase = "group-signal"
        try:
            signal.pidfd_send_signal(descriptor, 0, None, 1 << 2)
        except ProcessLookupError:
            phase = "trace-disposal"
            receipt = validate_trace_receipt(request["trace"], lease)
            return {"state": dispose_owned_trace(receipt)}
        raise ValueError("Observer group still alive during disposal")
    except (OSError, ValueError, IndexError, AttributeError, TypeError) as error:
        if not hasattr(error, "observer_phase"):
            error.observer_phase = phase
        raise
    finally:
        if descriptor is not None:
            os.close(descriptor)


def bootstrap(lease):
    validate_controller(lease)
    leader = lease["leader"]
    actual = process_identity(leader["pid"])
    if (actual["birthtimeTicks"] != leader["birthtimeTicks"]
            or actual["parentPid"] != lease["controller"]["pid"]
            or actual["processGroupId"] != leader["pid"] or actual["sessionId"] != leader["pid"]
            or os.getpgrp() != leader["pid"] or os.getsid(0) != leader["pid"]):
        raise ValueError("Observer escaped its owned process group")
    emit({"kind": "ownership", "generation": lease["generation"]})
    admission = read_private_input()
    exact_keys(admission, ("action", "generation", "deadlineEpochMs"))
    if admission["action"] != "admit" or admission["generation"] != lease["generation"]:
        raise ValueError("Observer capability admission missing")
    deadline = admission["deadlineEpochMs"]
    now = time.time() * 1000
    if type(deadline) is not int or not now < deadline <= now + 20000:
        raise ValueError("Invalid observer startup deadline")
    return time.monotonic() + (deadline - now) / 1000


def probe_group(lease, deadline):
    # Actual private trace instances plus a SIGKILL from the parent exercise the
    # same privileged group port. Leader exit closes inherited stdin, not this
    # descendant's lifetime; only the existing absolute deadline bounds its hold.
    with SignalTrace(lease["generation"], emit), SignalTrace(lease["generation"] + "-canary", emit):
        if os.fork() != 0:
            # The original Python/sudo leader is reaped while its root child
            # holds the same group and resources. Only the pinned group FD can
            # safely control that remaining lifetime after numeric leader exit.
            os._exit(0)
        emit({"kind": "probe-ready"})
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("Owned probe startup deadline exceeded")
            time.sleep(remaining)


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
    source = "protocol"
    kernel = None
    try:
        if sys.argv[1:] == ["--control"]:
            signal.alarm(5)
            try:
                emit(control(read_private_input()))
                return 0
            finally:
                signal.alarm(0)
        if sys.argv[1:]:
            raise ValueError("Unadmitted observer arguments")
        lease = validate_lease(read_private_input())
        source = "bootstrap"
        deadline = bootstrap(lease)
        if lease["purpose"] == "canary":
            emit({"kind": "canary-ready"})
            if sys.stdin.buffer.read(1) != b"":
                raise ValueError("Unexpected canary input")
            return 0
        if lease["purpose"] == "probe":
            source = "trace-probe"
            return probe_group(lease, deadline)
        root_pid = lease["controller"]["pid"]
        capture_root = lease["capture"]["path"]
        source = "process-events"
        with socket.socket(socket.AF_NETLINK, socket.SOCK_DGRAM, 11) as stream:
            try:
                stream.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 1024 * 1024)
                stream.bind((os.getpid(), 1))
                prove_connector(stream)
                source = "kernel-oom"
                kernel = os.open("/dev/kmsg", os.O_RDONLY | os.O_NONBLOCK)
                os.lseek(kernel, 0, os.SEEK_END)
                source = "signal-generation"
                with SignalTrace(lease["generation"], emit) as trace:
                    source = "userspace-oom"
                    journal = OomJournal()
                    source = "observation"
                    return observe(stream, kernel, root_pid, capture_root, trace, journal)
            finally:
                if kernel is not None:
                    os.close(kernel)
                subscription(stream, 2)
    except (OSError, ValueError, IndexError, AttributeError, TypeError, subprocess.SubprocessError) as error:
        phase = getattr(error, "observer_phase", source)
        if phase not in ("bootstrap", "descriptor-duplication", "group-signal", "trace-probe", "trace-disposal", "process-events", "kernel-oom", "signal-generation", "userspace-oom", "observation", "protocol", "retirement", "unknown"):
            phase = "unknown"
        code = error.errno if isinstance(error, OSError) else None
        if code in (errno.EACCES, errno.EPERM):
            reason = "denied"
        elif code in (errno.ENOENT, errno.ESRCH):
            reason = "missing"
        elif isinstance(error, (TimeoutError, subprocess.TimeoutExpired)):
            reason = "deadline"
        elif code in (errno.EINVAL, errno.ENOSYS, errno.ENOTSUP) or isinstance(error, (AttributeError, ValueError, IndexError, TypeError)):
            reason = "protocol" if phase == "protocol" else "invalid-or-unsupported"
        else:
            reason = "unavailable"
        emit({"kind": "unavailable", "phase": phase, "reason": reason})
        return 1


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, cancel_observer)
    sys.exit(main())
