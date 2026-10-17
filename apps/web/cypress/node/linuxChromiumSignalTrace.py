"""Owned concern: a private Linux SIGKILL generation trace, never global tracing."""
import os
from pathlib import Path
import re
import select
import subprocess
import sys
import tempfile
import time


def decode_signal_line(line):
    match = re.fullmatch(
        rb"\s*.+-(\d+)\s+(?:\(\s*\d+\)\s+)?\[\d+\]\s+\S+\s+"
        rb"(\d+)\.(\d{6}|\d{9}): signal_generate: sig=9 errno=(-?\d+) code=(-?\d+) "
        rb"comm=[^\r\n]* pid=([1-9]\d*) grp=([01]) res=([0-4])", line)
    if match is None:
        raise ValueError("Unsupported or lost signal trace record")
    tid, seconds, fraction, error, code, target, group, result = match.groups()
    return {"generatorTid": int(tid), "targetTid": int(target), "signal": 9,
            "timestampNs": int(seconds) * 10**9 + int(fraction.ljust(9, b"0")),
            "precisionNs": 10 ** (9 - len(fraction)), "signalCode": int(code),
            "signalErrno": int(error), "group": group == b"1", "result": int(result)}


class SignalLines:
    def __init__(self):
        self.pending = b""

    def feed(self, data):
        self.pending += data
        if len(self.pending) > 65536:
            raise ValueError("Signal trace buffer limit")
        lines = self.pending.split(b"\n")
        self.pending = lines.pop()
        return [decode_signal_line(line) for line in lines if line.strip()]

    def finish(self):
        if self.pending:
            raise ValueError("Truncated signal trace")


def assert_no_trace_loss(text):
    values = dict(line.split(":", 1) for line in text.splitlines() if ":" in line)
    if any(key not in values or int(values[key]) != 0
           for key in ("overrun", "commit overrun", "dropped events")):
        raise ValueError("Signal trace loss or missing counters")


def read_generator_snapshot(tid):
    directory = Path("/proc") / str(tid)
    before = (directory / "stat").read_text().rsplit(")", 1)[1].split()[19]
    executable = os.readlink(directory / "exe")
    status = (directory / "status").read_text()
    tgid = re.search(r"^Tgid:\s+([1-9]\d*)$", status, re.MULTILINE)
    after = (directory / "stat").read_text().rsplit(")", 1)[1].split()[19]
    if before != after or executable != os.readlink(directory / "exe") or tgid is None:
        raise ValueError("Unstable generator snapshot")
    return int(tgid[1]), int(before), executable


def generator_snapshot(tid):
    try:
        pid, birthtime, executable = read_generator_snapshot(tid)
        category = {"chrome": "chromium", "chromium": "chromium", "chromium-browser": "chromium",
                    "Cypress": "cypress", "node": "node", "nodejs": "node",
                    "systemd-oomd": "systemd-oomd", "earlyoom": "earlyoom", "systemd": "systemd"}.get(
                        Path(executable).name, "other")
        return {"generatorSnapshotPid": pid, "generatorSnapshotBirthtimeTicks": birthtime,
                "generatorCategory": category, "generatorCorrelation": "pid-only-after-event"}
    except (OSError, ValueError, IndexError):
        return {"generatorCategory": "unknown", "generatorCorrelation": "unavailable"}


class SignalTrace:
    def __init__(self, root=None):
        self.root = root
        self.instance = None
        self.fd = None
        self.lifetime_fd = None
        self.lines = SignalLines()

    def __enter__(self):
        root = self.root or next((path for path in (Path("/sys/kernel/tracing"), Path("/sys/kernel/debug/tracing"))
                                  if (path / "instances").is_dir()), None)
        if root is None:
            raise OSError("Mounted tracefs unavailable")
        try:
            self.instance = Path(tempfile.mkdtemp(prefix="dvt-signal-", dir=root / "instances"))
            self.write("tracing_on", "0")
            self.write("options/disable_on_free", "1")
            self.lifetime_fd = os.open(self.instance / "free_buffer", os.O_WRONLY)
            self.write("buffer_size_kb", "64")
            self.write("trace_clock", "mono")
            if "[mono]" not in (self.instance / "trace_clock").read_text():
                raise ValueError("Signal clock unavailable")
            self.write("events/signal/signal_generate/filter", "sig == 9")
            self.write("events/signal/signal_generate/enable", "1")
            self.fd = os.open(self.instance / "trace_pipe", os.O_RDONLY | os.O_NONBLOCK)
            self.write("tracing_on", "1")
            self.prove()
            return self
        except BaseException:
            self.__exit__(None, None, None)
            raise

    def write(self, relative, value):
        # Never create ordinary files if the kernel does not expose a control.
        with (self.instance / relative).open("r+") as control:
            control.write(value)

    def read(self):
        data = os.read(self.fd, 32768)
        if not data:
            raise BlockingIOError("Signal buffer drained")
        return self.lines.feed(data)

    def prove(self):
        probe = subprocess.Popen([sys.executable, "-I", "-B", "-c", "import sys; sys.stdin.buffer.read(1)"],
                                 stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 env={"PATH": "/usr/bin:/bin"})
        started = time.monotonic_ns()
        try:
            probe.kill()
            deadline = time.monotonic() + 3
            while time.monotonic() < deadline:
                if not select.select([self.fd], [], [], max(0, deadline - time.monotonic()))[0]:
                    break
                for event in self.read():
                    if (event["generatorTid"] == os.getpid() and event["targetTid"] == probe.pid
                            and event["signalCode"] == 0 and event["result"] == 0
                            and started <= event["timestampNs"] + event["precisionNs"]
                            and event["timestampNs"] <= time.monotonic_ns()):
                        if probe.wait(timeout=3) != -9:
                            raise ValueError("Signal probe exit mismatch")
                        return
            raise ValueError("Signal generation probe not observed")
        finally:
            if probe.poll() is None:
                probe.kill()
            probe.wait(timeout=3)
            probe.stdin.close()

    def finish(self):
        self.write("tracing_on", "0")
        events = []
        for _ in range(1024):
            try:
                events.extend(self.read())
            except BlockingIOError:
                break
        else:
            raise ValueError("Signal trace drain limit")
        self.lines.finish()
        stats = list((self.instance / "per_cpu").glob("cpu*/stats"))
        if not stats:
            raise ValueError("Missing trace loss counters")
        for stat in stats:
            assert_no_trace_loss(stat.read_text())
        return events

    def __exit__(self, *_):
        try:
            if self.instance is not None:
                self.write("tracing_on", "0")
        finally:
            try:
                try:
                    if self.fd is not None:
                        os.close(self.fd)
                        self.fd = None
                finally:
                    if self.lifetime_fd is not None:
                        os.close(self.lifetime_fd)
                        self.lifetime_fd = None
            finally:
                if self.instance is not None:
                    self.instance.rmdir()
                    self.instance = None
