"""Owned concern: bounded current-boot OOM-daemon journal, with no raw publication."""
import json
import os
import re
import selectors
import subprocess
import time


def read_journal(arguments):
    child = subprocess.Popen(["/usr/bin/journalctl", "--no-pager", "--boot=0", "--output=json", *arguments],
                             stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"})
    output = bytearray()
    deadline = time.monotonic() + 5
    try:
        os.set_blocking(child.stdout.fileno(), False)
        with selectors.DefaultSelector() as selection:
            selection.register(child.stdout, selectors.EVENT_READ)
            while True:
                if not selection.select(max(0, deadline - time.monotonic())):
                    raise ValueError("OOM journal read deadline")
                chunk = os.read(child.stdout.fileno(), 32768)
                if not chunk:
                    break
                output.extend(chunk)
                if len(output) > 1048576 or time.monotonic() >= deadline:
                    raise ValueError("OOM journal output limit")
        if child.wait(timeout=max(0.001, deadline - time.monotonic())) != 0:
            raise ValueError("OOM journal read failed")
        return bytes(output)
    finally:
        if child.poll() is None:
            child.kill()
        child.wait(timeout=3)
        child.stdout.close()


def project_oom_entry(entry, boot_id, started_ns, ended_ns, owns_pid):
    for key in ("_COMM", "_SYSTEMD_UNIT", "_PID", "__MONOTONIC_TIMESTAMP", "_BOOT_ID", "MESSAGE"):
        if not isinstance(entry.get(key), str):
            raise ValueError("Missing or ambiguous journal field")
    pid = int(entry["_PID"])
    timestamp = int(entry["__MONOTONIC_TIMESTAMP"]) * 1000
    if pid < 1 or timestamp < 0:
        raise ValueError("Invalid journal identity")
    daemon = entry["_COMM"]
    if (entry["_BOOT_ID"] != boot_id or not started_ns <= timestamp <= ended_ns
            or entry["_SYSTEMD_UNIT"] != daemon + ".service"):
        return None
    base = {"kind": "userspace-oom-report", "daemon": daemon, "daemonPid": pid, "timestampNs": timestamp}
    message = entry["MESSAGE"]
    if daemon == "earlyoom":
        match = re.match(r"sending (SIGKILL|SIGTERM) to process ([1-9]\d*) uid \d+ ", message)
        if match and owns_pid(int(match[2])):
            return {**base, "action": "signal-attempt", "signal": 9 if match[1] == "SIGKILL" else 15,
                    "victimPid": int(match[2]), "correlation": "pid-only"}
    elif daemon == "systemd-oomd" and re.match(r"Killed .+ due to (?:memory pressure for |memory used \()", message):
        return {**base, "action": "cgroup-kill-report", "correlation": "runner-interval-only"}
    return None


class OomJournal:
    def __init__(self):
        baseline = read_journal(["--lines=1", "--output-fields=__CURSOR,_BOOT_ID"])
        rows = baseline.splitlines()
        if len(rows) != 1:
            raise ValueError("Journal baseline unavailable")
        entry = json.loads(rows[0])
        self.cursor = entry.get("__CURSOR")
        self.boot_id = entry.get("_BOOT_ID")
        if (not isinstance(self.cursor, str) or not re.fullmatch(r"[A-Za-z0-9=;]+", self.cursor)
                or len(self.cursor) > 512 or not isinstance(self.boot_id, str)
                or not re.fullmatch(r"[0-9a-f]{32}", self.boot_id)):
            raise ValueError("Invalid journal baseline")
        self.started_ns = time.monotonic_ns()

    def finish(self, owns_pid):
        ended_ns = time.monotonic_ns()
        raw = read_journal([f"--after-cursor={self.cursor}", "--lines=201",
                            "--output-fields=_COMM,_SYSTEMD_UNIT,_PID,_BOOT_ID,__MONOTONIC_TIMESTAMP,MESSAGE",
                            "--unit=systemd-oomd.service", "--unit=earlyoom.service",
                            "_COMM=systemd-oomd", "_COMM=earlyoom"])
        lines = raw.splitlines()
        if len(lines) >= 201:
            raise ValueError("OOM journal record limit")
        records = []
        for line in lines:
            projected = project_oom_entry(json.loads(line), self.boot_id, self.started_ns, ended_ns, owns_pid)
            if projected is not None:
                records.append(projected)
        return [*records, {"kind": "userspace-oom-coverage", "entriesRead": len(lines),
                          "reportsRetained": len(records), "scope": "systemd-oomd-and-earlyoom",
                          "startedNs": str(self.started_ns), "endedNs": str(ended_ns)}]
