"""Owned concern: Linux process evidence decoding and privacy boundaries."""
import importlib.util
from pathlib import Path
import struct
import unittest
from unittest.mock import patch


MODULE = Path(__file__).resolve().parents[1] / "apps/web/cypress/node/linuxChromiumProcessProtocol.py"
SPEC = importlib.util.spec_from_file_location("process_protocol", MODULE)
protocol = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(protocol)
OBSERVER_SPEC = importlib.util.spec_from_file_location("process_observer", MODULE.with_name("linuxChromiumProcessObserver.py"))
observer = importlib.util.module_from_spec(OBSERVER_SPEC)
OBSERVER_SPEC.loader.exec_module(observer)


def packet(kind, fields, sequence=4):
    event = struct.pack("=IIQ", kind, 2, 123456) + struct.pack("=" + "I" * len(fields), *fields)
    connector = struct.pack("=IIIIHH", 1, 1, sequence, 0, len(event), 0) + event
    return struct.pack("=IHHII", 16 + len(connector), 3, 0, 0, 0) + connector


class ProcessProtocolTest(unittest.TestCase):
    def test_exit_wait_status_is_not_the_parent_notification(self):
        self.assertEqual(protocol.decode_wait_status(23 << 8), {"exitCode": 23})
        self.assertEqual(protocol.decode_wait_status(9), {"signal": 9, "coreDumped": False})
        self.assertEqual(protocol.decode_wait_status(11 | 128), {"signal": 11, "coreDumped": True})
        event = protocol.decode_process_events(packet(0x80000000, [21, 21, 9, 17, 10, 10]))[0]
        self.assertEqual(event["waitStatus"], 9)
        self.assertEqual(event["parentNotification"], 17)

    def test_multiple_frames_keep_numeric_event_identity(self):
        events = protocol.decode_process_events(packet(0, [0]) + packet(1, [10, 10, 21, 21]))
        self.assertEqual(events[0]["ackError"], 0)
        self.assertEqual(events[1]["parentPid"], 10)
        self.assertEqual(events[1]["pid"], 21)
        self.assertEqual(events[1]["timestampNs"], 123456)
        self.assertEqual(events[1]["sequence"], 4)

    def test_ack_counts_toward_cpu_sequence_continuity(self):
        observation = observer.Observation(10, "/tmp/owned")
        with patch.object(observer, "emit") as emit:
            observation.processes(packet(1, [10, 10, 21, 21], sequence=10))
            observation.processes(packet(0, [0], sequence=11))
            observation.processes(packet(1, [21, 21, 22, 22], sequence=12))
        emit.assert_not_called()
        self.assertFalse(observation.incomplete)

    def test_cpu_sequences_are_independent_and_real_gaps_remain_explicit(self):
        observation = observer.Observation(10, "/tmp/owned")
        with patch.object(observer, "emit") as emit:
            observation.processes(packet(1, [10, 10, 21, 21], sequence=10))
            other_cpu = packet(1, [21, 21, 22, 22], sequence=99)
            observation.processes(other_cpu[:40] + struct.pack("=I", 3) + other_cpu[44:])
            emit.assert_not_called()
            observation.processes(packet(1, [22, 22, 23, 23], sequence=12))
        emit.assert_called_once_with({"kind": "coverage-gap", "source": "process-events", "reason": "sequence-gap"})
        self.assertTrue(observation.incomplete)

    def test_missing_owned_browser_identity_cannot_report_complete_coverage(self):
        observation = observer.Observation(10, "/tmp/owned")
        with patch.object(observer, "emit") as emit:
            self.assertEqual(observation.finish(), 1)
        self.assertEqual(emit.call_args_list[0].args[0]["reason"], "browser-not-observed")
        self.assertTrue(emit.call_args_list[-1].args[0]["incomplete"])

    def test_malformed_or_wrong_connector_never_becomes_empty_evidence(self):
        valid = packet(0, [0])
        for invalid in [b"", valid[:-1], b"\x01\x00\x00\x00" + valid[4:],
                        valid[:16] + struct.pack("=I", 99) + valid[20:]]:
            with self.subTest(length=len(invalid)), self.assertRaises(ValueError):
                protocol.decode_process_events(invalid)
        for status in [-1, 65536, 127]:
            with self.subTest(status=status), self.assertRaises(ValueError):
                protocol.decode_wait_status(status)

    def test_browser_identity_requires_the_exact_owned_capture_directory(self):
        root = "/tmp/dvt-chromium-network-owned"
        browser = b"chrome\0--log-net-log=/tmp/dvt-chromium-network-owned/chrome-Ab12/netlog.json\0"
        self.assertEqual(protocol.classify_arguments(browser, root), "browser")
        self.assertEqual(protocol.classify_arguments(browser.replace(b"owned/", b"unowned/"), root), "other")
        self.assertEqual(protocol.classify_arguments(browser.replace(b"chrome-Ab12/", b"../"), root), "other")

    def test_network_identity_is_exact_and_truncated_arguments_are_unknown(self):
        args = b"chrome\0--utility-sub-type=network.mojom.NetworkService\0--private=secret\0"
        self.assertEqual(protocol.classify_arguments(args, "/tmp/owned"), "network")
        self.assertEqual(protocol.classify_arguments(args.replace(b"Service\0", b"ServiceOther\0"), "/tmp/owned"), "other")
        self.assertEqual(protocol.classify_arguments(args[:-1], "/tmp/owned"), "unknown")

    def test_birthtime_handles_parentheses_in_process_name(self):
        stat = "21 (name with ) parentheses) " + " ".join(["S"] + ["0"] * 18 + ["98765"])
        self.assertEqual(protocol.parse_birthtime(stat), 98765)
        with self.assertRaises(ValueError):
            protocol.parse_birthtime("21 (incomplete)")

    def test_kernel_projection_keeps_only_sequence_time_and_victim(self):
        event = protocol.decode_kernel_record(b"6,71,1234,-;Out of memory: Killed process 21 (private) secret\n")
        self.assertEqual(event, {"sequence": 71, "timestampNs": 1234000, "victimPid": 21})
        ordinary = protocol.decode_kernel_record(b"6,72,1235,-;private unrelated kernel text\n")
        self.assertEqual(ordinary, {"sequence": 72, "timestampNs": 1235000})
        with self.assertRaises(ValueError):
            protocol.decode_kernel_record(b"malformed private record")

    def test_user_messages_cannot_claim_kernel_oom_evidence(self):
        event = protocol.decode_kernel_record(b"14,71,1234,-;Out of memory: Killed process 21 (chrome)\n")
        self.assertNotIn("victimPid", event)

    def test_ownership_excludes_electron_network_and_unrelated_processes(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(99, 20, 1)
        self.assertNotIn(20, ledger.processes)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 200, "network")
        self.assertIsNone(ledger.exit({"pid": 21, "tid": 21, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17}))

    def test_browser_identity_propagates_through_zygote_without_relabeling_cypress(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.fork(21, 22, 3)
        ledger.fork(22, 23, 4)
        ledger.identify(23, 230, "network")
        ledger.identify(21, 210, "browser")
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "network-service")
        self.assertEqual(event["browserPid"], 21)
        self.assertEqual(event["birthtimeTicks"], 230)
        self.assertEqual(event["signal"], 9)

    def test_pid_reuse_never_inherits_network_identity_or_an_old_oom(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser")
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network")
        ledger.fork(21, 23, 30)
        self.assertIsNone(ledger.oom({"victimPid": 23, "timestampNs": 20}))
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 40, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "owned-child-unknown")
        self.assertIsNone(event["birthtimeTicks"])

    def test_reused_parent_from_an_unowned_tree_cannot_admit_children(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser")
        ledger.exit({"pid": 21, "tid": 21, "timestampNs": 20, "waitStatus": 0, "parentNotification": 17})
        ledger.fork(99, 21, 30)
        ledger.fork(21, 23, 40)
        ledger.identify(23, 230, "network")
        self.assertIsNone(ledger.exit({"pid": 23, "tid": 23, "timestampNs": 50, "waitStatus": 9, "parentNotification": 17}))

    def test_indeterminate_arguments_do_not_erase_same_lifetime_identity(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser")
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network")
        ledger.identify(21, 210, "unknown")
        ledger.identify(23, 230, "unknown")
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "network-service")

    def test_oom_requires_an_owned_browser_lifetime(self):
        ledger = protocol.OwnedProcesses(10)
        self.assertIsNone(ledger.oom({"victimPid": 99, "timestampNs": 10}))
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser")
        event = ledger.oom({"victimPid": 21, "timestampNs": 10})
        self.assertEqual(event["kind"], "oom-victim")
        self.assertEqual(event["pid"], 21)


if __name__ == "__main__":
    unittest.main()
