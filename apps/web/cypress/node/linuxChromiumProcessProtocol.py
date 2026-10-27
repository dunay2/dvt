"""Owned concern: decode Linux process metadata without retaining raw process data."""
import os
from pathlib import PurePosixPath
import re
import struct


def decimal(value):
    return isinstance(value, str) and re.fullmatch(r"(?:0|[1-9][0-9]{0,24})", value) is not None


def exact_keys(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError("Invalid private observer receipt")


def validate_lease(value):
    exact_keys(value, ("version", "purpose", "generation", "controller", "leader",
                       "leaderProcReference", "capture"))
    if (type(value["version"]) is not int or value["version"] != 1 or value["purpose"] not in ("probe", "observe", "canary")
            or not isinstance(value["generation"], str)
            or re.fullmatch(r"[A-Za-z0-9-]{6,80}", value["generation"]) is None):
        raise ValueError("Invalid private observer generation")
    for name in ("controller", "leader"):
        fields = ("pid", "birthtimeTicks") if name == "controller" else ("pid", "birthtimeTicks", "processGroupId", "sessionId")
        exact_keys(value[name], fields)
        if (type(value[name]["pid"]) is not int or value[name]["pid"] < 1
                or not decimal(value[name]["birthtimeTicks"])):
            raise ValueError("Invalid private process identity")
    leader = value["leader"]
    if (type(leader["processGroupId"]) is not int or type(leader["sessionId"]) is not int
            or leader["processGroupId"] != leader["pid"] or leader["sessionId"] != leader["pid"]):
        raise ValueError("Unowned observer group")
    reference = value["leaderProcReference"]
    exact_keys(reference, ("ownerFd", "device", "inode"))
    if type(reference["ownerFd"]) is not int or reference["ownerFd"] < 3:
        raise ValueError("Invalid owned descriptor")
    exact_keys(value["capture"], ("path", "device", "inode"))
    if (not isinstance(value["capture"]["path"], str)
            or not PurePosixPath(value["capture"]["path"]).is_absolute()
            or not PurePosixPath(value["capture"]["path"]).name.startswith("dvt-chromium-network-")):
        raise ValueError("Invalid owned capture")
    for identity in (reference, value["capture"]):
        if not decimal(identity["device"]) or not decimal(identity["inode"]):
            raise ValueError("Invalid owned filesystem identity")
    return value


def validate_trace_receipt(value, lease):
    exact_keys(value, ("generation", "rootKind", "name", "device", "inode"))
    generations = [lease["generation"]]
    if lease["purpose"] == "probe":
        generations.append(lease["generation"] + "-canary")
    if (value["generation"] not in generations or value["rootKind"] not in ("tracefs", "debug-tracing")
            or value["name"] != "dvt-signal-" + value["generation"]
            or not decimal(value["device"]) or not decimal(value["inode"])):
        raise ValueError("Invalid owned trace receipt")
    return value


def decode_wait_status(status):
    if not isinstance(status, int) or not 0 <= status <= 0xffff:
        raise ValueError("Invalid process wait status")
    signal = status & 0x7f
    if signal == 0x7f:
        raise ValueError("Nonterminal process status")
    if signal:
        return {"signal": signal, "coreDumped": bool(status & 0x80)}
    return {"exitCode": status >> 8}


def decode_process_events(packet):
    events = []
    offset = 0
    while offset < len(packet):
        if len(packet) - offset < 36:
            raise ValueError("Incomplete process envelope")
        length, message_type = struct.unpack_from("=IH", packet, offset)
        if length < 52 or offset + length > len(packet) or message_type != 3:
            raise ValueError("Invalid process envelope")
        index, value, sequence, _, size, _ = struct.unpack_from("=IIIIHH", packet, offset + 16)
        if (index, value) != (1, 1) or size != length - 36:
            raise ValueError("Invalid process connector")
        what, cpu, timestamp = struct.unpack_from("=IIQ", packet, offset + 36)
        event = {"kind": what, "cpu": cpu, "sequence": sequence, "timestampNs": timestamp}
        required = {0: 4, 1: 16, 2: 8, 0x200: 8, 0x80000000: 16}.get(what, 0)
        if size < 16 + required:
            raise ValueError("Incomplete process event")
        data = offset + 52
        if what == 0:
            event["ackError"] = struct.unpack_from("=I", packet, data)[0]
        elif what == 1:
            _, parent, tid, pid = struct.unpack_from("=IIII", packet, data)
            event.update(parentPid=parent, tid=tid, pid=pid)
        elif what in (2, 0x200, 0x80000000):
            tid, pid = struct.unpack_from("=II", packet, data)
            event.update(tid=tid, pid=pid)
            if what == 0x80000000:
                status, notification = struct.unpack_from("=II", packet, data + 8)
                event.update(waitStatus=status, parentNotification=notification)
        events.append(event)
        offset += (length + 3) & ~3
    if not events or offset != len(packet):
        raise ValueError("Empty or truncated process events")
    return events


def classify_arguments(arguments, capture_root, executable):
    if not arguments or not arguments.endswith(b"\0") or len(arguments) >= 131072:
        return "unknown"
    if PurePosixPath(executable).name not in ("chrome", "chromium", "chromium-browser"):
        return "other"
    values = arguments.rstrip(b"\0").split(b"\0")
    if len(values) == 1 and b" " in values[0]:
        prefix = os.fsencode(executable) + b" "
        if not values[0].startswith(prefix):
            return "unknown"
        title = values[0][len(prefix):]
        # Chromium's title is lossy, not shell argv. Keep quoted spans opaque;
        # never interpret escapes or quoted markers as process identity.
        values = re.findall(rb"(?:[^\s\"'\\]+|'[^'\\]*'|\"[^\"\\]*\")+", title)
        if b" ".join(values) != title:
            return "unknown"
    markers = {}
    for key in (b"--type", b"--utility-sub-type", b"--log-net-log"):
        matches = [value for value in values if value == key or value.startswith(key + b"=")]
        if len(matches) > 1 or any(value == key or any(char in value for char in (b"'", b'"', b"\\")) for value in matches):
            return "unknown"
        markers[key] = matches[0][len(key) + 1:] if matches else None
    if markers[b"--type"] == b"utility" and markers[b"--utility-sub-type"] == b"network.mojom.NetworkService":
        return "network"
    if markers[b"--type"] is not None or markers[b"--utility-sub-type"] is not None:
        return "other"
    target_value = markers[b"--log-net-log"]
    if target_value is not None:
        target = PurePosixPath(os.fsdecode(target_value))
        try:
            relative = target.relative_to(PurePosixPath(capture_root))
        except ValueError:
            return "other"
        if (os.fsencode(str(target)) == target_value and len(relative.parts) == 2
                and re.fullmatch(r"chrome-[A-Za-z0-9]+", relative.parts[0]) and relative.name == "netlog.json"):
            return "browser"
    return "other"


def parse_birthtime(stat):
    try:
        return int(stat.rsplit(")", 1)[1].split()[19])
    except (ValueError, IndexError):
        raise ValueError("Invalid process identity") from None


def decode_kernel_record(record):
    try:
        header, message = record.split(b";", 1)
        fields = header.split(b",")
        facility = int(fields[0]) >> 3
        result = {"sequence": int(fields[1]), "timestampNs": int(fields[2]) * 1000}
    except (ValueError, IndexError):
        raise ValueError("Invalid kernel record") from None
    victim = re.match(rb"(?:Out of memory|Memory cgroup out of memory): Killed process ([1-9][0-9]*) ", message)
    if victim and facility == 0:
        result["victimPid"] = int(victim.group(1))
    return result


class OwnedProcesses:
    """Pure lifetime ledger: a reused PID cannot inherit a retired identity."""

    def __init__(self, root_pid):
        self.processes = {root_pid: self._lifetime(root_pid, 0, None)}
        self.confirmed_roles = set()
        self.threads = {}

    @staticmethod
    def _lifetime(pid, timestamp, parent):
        return {"pid": pid, "startedNs": timestamp, "endedNs": None,
                "birthtimeTicks": None, "role": "unknown", "observedNs": None, "parent": parent}

    def fork(self, parent_pid, pid, timestamp):
        parent = self.processes.get(parent_pid)
        # A fork replaces the old PID lifetime even when the new tree is unowned.
        self.processes.pop(pid, None)
        self.threads.pop(pid, None)
        if (parent is not None and parent["startedNs"] <= timestamp
                and (parent["endedNs"] is None or timestamp <= parent["endedNs"])):
            self.processes[pid] = self._lifetime(pid, timestamp, parent)

    def thread(self, pid, tid):
        self.threads.pop(tid, None)
        self.processes.pop(tid, None)
        owner = self.processes.get(pid)
        if owner is not None and owner["endedNs"] is None:
            self.threads[tid] = owner

    def identify(self, pid, birthtime, role, observed_ns):
        record = self.processes.get(pid)
        if record is None or record["endedNs"] is not None:
            return
        if record["birthtimeTicks"] not in (None, birthtime):
            # /proc may already expose a reused PID while the older EXIT is
            # queued. Only process events retire or replace the admitted life.
            return
        record["birthtimeTicks"] = birthtime
        if role != "unknown" and record["role"] != role:
            record["role"] = role
            record["observedNs"] = observed_ns

    @staticmethod
    def _browser(record, timestamp):
        ancestor = record
        browser = None
        while ancestor is not None:
            if ancestor["role"] == "browser":
                browser = ancestor
            ancestor = ancestor["parent"]
        return browser if browser is not None and (timestamp is None or browser["observedNs"] <= timestamp) else None

    def _identity(self, pid, timestamp):
        record = self.processes.get(pid)
        if record is None or timestamp < record["startedNs"]:
            return None
        if record["endedNs"] is not None and timestamp > record["endedNs"]:
            return None
        browser = self._browser(record, timestamp)
        if browser is None:
            return None
        known = record["observedNs"] is not None and record["observedNs"] <= timestamp
        role = {"browser": "browser", "network": "network-service", "other": "owned-child"}.get(record["role"] if known else "unknown", "owned-child-unknown")
        if role == "browser" and browser is not record:
            role = "owned-child"
        return {"pid": pid, "browserPid": browser["pid"], "role": role,
                "birthtimeTicks": record["birthtimeTicks"] if known else None, "timestampNs": timestamp}

    def observed_roles(self, now_ns):
        return self.confirmed_roles | {identity["role"] for record in self.processes.values()
                if record["endedNs"] is None and (identity := self._identity(record["pid"], now_ns)) is not None}

    def exit(self, event):
        identity = self._identity(event["pid"], event["timestampNs"])
        record = self.processes.get(event["pid"])
        if record is not None and event["tid"] == event["pid"]:
            record["endedNs"] = event["timestampNs"]
        if identity is None:
            return None
        self.confirmed_roles.update(("browser", identity["role"]))
        # Retain the process leader and abnormal thread exits; normal worker-thread
        # completion is not termination of the network service.
        if event["tid"] != event["pid"] and event["waitStatus"] == 0:
            return None
        return {**identity, "kind": "process-exit", "tid": event["tid"],
                "parentNotification": event["parentNotification"],
                **decode_wait_status(event["waitStatus"])}

    def oom(self, event):
        if not self.owns_candidate(event.get("victimPid")):
            return None
        return {"kind": "kernel-oom-victim", "victimPid": event["victimPid"],
                "timestampNs": event["timestampNs"], "clock": "kernel-log", "correlation": "pid-only"}

    def owns_candidate(self, pid):
        """PID-only evidence scope, deliberately not a lifetime attribution."""
        return self.candidate_process_pid(pid) is not None

    def candidate_process_pid(self, tid):
        record = self.processes.get(tid) or self.threads.get(tid)
        if (record is not None and self.processes.get(record["pid"]) is record
                and self._browser(record, None) is not None):
            return record["pid"]
        return None
