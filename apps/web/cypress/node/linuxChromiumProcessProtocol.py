"""Owned concern: decode Linux process metadata without retaining raw process data."""
import os
from pathlib import PurePosixPath
import re
import struct


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


def classify_arguments(arguments, capture_root):
    if not arguments or not arguments.endswith(b"\0") or len(arguments) >= 131072:
        return "unknown"
    values = arguments.split(b"\0")
    if b"--utility-sub-type=network.mojom.NetworkService" in values:
        return "network"
    if any(value == b"--type" or value.startswith(b"--type=") for value in values):
        return "other"
    for value in values:
        if not value.startswith(b"--log-net-log="):
            continue
        target = PurePosixPath(os.fsdecode(value[len(b"--log-net-log="):]))
        try:
            relative = target.relative_to(PurePosixPath(capture_root))
        except ValueError:
            continue
        if len(relative.parts) == 2 and re.fullmatch(r"chrome-[A-Za-z0-9]+", relative.parts[0]) and relative.name == "netlog.json":
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

    @staticmethod
    def _lifetime(pid, timestamp, parent):
        return {"pid": pid, "startedNs": timestamp, "endedNs": None,
                "birthtimeTicks": None, "role": "unknown", "parent": parent}

    def fork(self, parent_pid, pid, timestamp):
        parent = self.processes.get(parent_pid)
        # A fork replaces the old PID lifetime even when the new tree is unowned.
        self.processes.pop(pid, None)
        if (parent is not None and parent["startedNs"] <= timestamp
                and (parent["endedNs"] is None or timestamp <= parent["endedNs"])):
            self.processes[pid] = self._lifetime(pid, timestamp, parent)

    def identify(self, pid, birthtime, role):
        record = self.processes.get(pid)
        if record is None or record["endedNs"] is not None:
            return
        if record["birthtimeTicks"] not in (None, birthtime):
            record["role"] = "unknown"
            record["endedNs"] = record["startedNs"]
            return
        record["birthtimeTicks"] = birthtime
        if role != "unknown":
            record["role"] = role

    def _identity(self, pid, timestamp):
        record = self.processes.get(pid)
        if record is None or timestamp < record["startedNs"]:
            return None
        if record["endedNs"] is not None and timestamp > record["endedNs"]:
            return None
        ancestor = record
        while ancestor is not None and ancestor["role"] != "browser":
            ancestor = ancestor["parent"]
        if ancestor is None:
            return None
        role = {"browser": "browser", "network": "network-service", "other": "owned-child"}.get(record["role"], "owned-child-unknown")
        return {"pid": pid, "browserPid": ancestor["pid"], "role": role,
                "birthtimeTicks": record["birthtimeTicks"], "timestampNs": timestamp}

    def exit(self, event):
        identity = self._identity(event["pid"], event["timestampNs"])
        record = self.processes.get(event["pid"])
        if record is not None and event["tid"] == event["pid"]:
            record["endedNs"] = event["timestampNs"]
        if identity is None:
            return None
        # Retain the process leader and abnormal thread exits; normal worker-thread
        # completion is not termination of the network service.
        if event["tid"] != event["pid"] and event["waitStatus"] == 0:
            return None
        return {**identity, "kind": "process-exit", "tid": event["tid"],
                "parentNotification": event["parentNotification"],
                **decode_wait_status(event["waitStatus"])}

    def oom(self, event):
        identity = self._identity(event.get("victimPid"), event["timestampNs"])
        return None if identity is None else {**identity, "kind": "oom-victim"}
