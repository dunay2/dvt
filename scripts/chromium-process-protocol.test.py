"""Owned concern: Linux process evidence decoding and privacy boundaries."""
import importlib.util
import io
import copy
import errno
import stat
from pathlib import Path
import struct
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch


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
    def test_private_receipt_rejects_foreign_generation_and_non_group_identity(self):
        lease = {"version": 1, "purpose": "observe", "generation": "unit-owned",
                 "controller": {"pid": 10, "birthtimeTicks": "100"},
                 "leader": {"pid": 20, "birthtimeTicks": "200", "processGroupId": 20, "sessionId": 20},
                 "leaderProcReference": {"ownerFd": 9, "device": "1", "inode": "2"},
                 "capture": {"path": "/tmp/dvt-chromium-network-owned", "device": "3", "inode": "4"}}
        self.assertEqual(protocol.validate_lease(lease), lease)
        for field, value in [("processGroupId", 99), ("sessionId", 99), ("processGroupId", 20.0), ("sessionId", True)]:
            bad = copy.deepcopy(lease)
            bad["leader"][field] = value
            with self.assertRaises(ValueError):
                protocol.validate_lease(bad)
        for generation in ["../foreign", "x" * 81, "short"]:
            with self.assertRaises(ValueError):
                protocol.validate_lease({**lease, "generation": generation})
        trace = {"generation": "unit-owned", "rootKind": "tracefs", "name": "dvt-signal-unit-owned", "device": "1", "inode": "2"}
        self.assertEqual(protocol.validate_trace_receipt(trace, lease), trace)
        for patch_value in [{"generation": "foreign-owned"}, {"name": "../foreign"}, {"rootKind": "arbitrary"}, {"inode": 2}]:
            with self.assertRaises(ValueError):
                protocol.validate_trace_receipt({**trace, **patch_value}, lease)

    @patch.object(observer.signal, "SIGKILL", 9, create=True)
    def test_group_control_uses_only_duplicated_pinned_descriptor_and_kernel_group_flag(self):
        lease = {"version": 1, "purpose": "observe", "generation": "unit-owned",
                 "controller": {"pid": 10, "birthtimeTicks": "100"},
                 "leader": {"pid": 20, "birthtimeTicks": "200", "processGroupId": 20, "sessionId": 20},
                 "leaderProcReference": {"ownerFd": 9, "device": "1", "inode": "2"},
                 "capture": {"path": "/tmp/dvt-chromium-network-owned", "device": "3", "inode": "4"}}
        duplicate = MagicMock(return_value=42)
        with patch.object(observer, "validate_controller"), \
                patch.object(observer, "process_identity", return_value={"birthtimeTicks": "100"}), \
                patch.object(observer.os, "pidfd_open", return_value=41, create=True) as pidfd, \
                patch.object(observer.ctypes, "CDLL", return_value=SimpleNamespace(pidfd_getfd=duplicate)), \
                patch.object(observer.os, "fstat", return_value=SimpleNamespace(st_mode=stat.S_IFDIR, st_dev=1, st_ino=2)), \
                patch.object(observer.os, "close") as close, \
                patch.object(observer.signal, "pidfd_send_signal", create=True) as send:
            self.assertEqual(observer.control({"action": "signal-owned-group", "lease": lease, "signal": 9}), {"state": "alive"})
            pidfd.assert_called_once_with(10, 0)
            duplicate.assert_called_once_with(41, 9, 0)
            send.assert_called_once_with(42, 9, None, 1 << 2)
            self.assertEqual([call.args[0] for call in close.call_args_list], [41, 42])
        with patch.object(observer, "duplicate_reference", return_value=42), patch.object(observer.os, "close"), \
                patch.object(observer.signal, "pidfd_send_signal", side_effect=ProcessLookupError, create=True):
            self.assertEqual(observer.control({"action": "signal-owned-group", "lease": lease, "signal": 0}), {"state": "gone"})
        for failure in [ProcessLookupError(), PermissionError(errno.EPERM, "denied"), AttributeError("unsupported")]:
            with patch.object(observer, "duplicate_reference", side_effect=failure), self.assertRaises(type(failure)):
                observer.control({"action": "signal-owned-group", "lease": lease, "signal": 0})
        with patch.object(observer, "duplicate_reference", return_value=42), patch.object(observer.os, "close"), \
                patch.object(observer.signal, "pidfd_send_signal", side_effect=OSError(errno.EINVAL, "unsupported group flag"), create=True), \
                self.assertRaises(OSError):
            observer.control({"action": "signal-owned-group", "lease": lease, "signal": 0})
        for operation, failure, phase, reason in [
                ("duplicate_reference", PermissionError(errno.EPERM, "private /capture fd=42"), "descriptor-duplication", "denied"),
                ("pidfd_send_signal", OSError(errno.EINVAL, "private unsupported group flag"), "group-signal", "invalid-or-unsupported")]:
            with patch.object(observer.sys, "argv", ["observer", "--control"]), \
                    patch.object(observer, "read_private_input", return_value={"action": "signal-owned-group", "lease": lease, "signal": 0}), \
                    patch.object(observer.signal, "alarm", create=True), patch.object(observer, "emit") as emit, \
                    patch.object(observer, "duplicate_reference", side_effect=failure if operation == "duplicate_reference" else None, return_value=42), \
                    patch.object(observer.os, "close"), \
                    patch.object(observer.signal, "pidfd_send_signal", side_effect=failure if operation == "pidfd_send_signal" else None, create=True):
                self.assertEqual(observer.main(), 1)
                emit.assert_called_once_with({"kind": "unavailable", "phase": phase, "reason": reason})

    def test_pinned_descriptor_mismatch_and_pid_reuse_fail_before_any_signal(self):
        lease = {"controller": {"pid": 10, "birthtimeTicks": "100"},
                 "leaderProcReference": {"ownerFd": 9, "device": "1", "inode": "2"}}
        for birthtime, inode in [("101", 2), ("100", 99)]:
            with patch.object(observer, "validate_controller"), \
                    patch.object(observer, "process_identity", return_value={"birthtimeTicks": birthtime}), \
                    patch.object(observer.os, "pidfd_open", return_value=41, create=True), \
                    patch.object(observer.ctypes, "CDLL", return_value=SimpleNamespace(pidfd_getfd=MagicMock(return_value=42))), \
                    patch.object(observer.os, "fstat", return_value=SimpleNamespace(st_mode=stat.S_IFDIR, st_dev=1, st_ino=inode)), \
                    patch.object(observer.os, "close"), self.assertRaises(ValueError):
                observer.duplicate_reference(lease)

    def test_bootstrap_rejects_pty_group_split_before_capability_ack_or_resources(self):
        lease = {"generation": "unit-owned", "controller": {"pid": 10},
                 "leader": {"pid": 20, "birthtimeTicks": "200"}}
        with patch.object(observer, "validate_controller"), \
                patch.object(observer, "process_identity", return_value={"birthtimeTicks": "200", "parentPid": 10, "processGroupId": 20, "sessionId": 20}), \
                patch.object(observer.os, "getpgrp", return_value=99, create=True), \
                patch.object(observer, "emit") as emit, self.assertRaises(ValueError):
            observer.bootstrap(lease)
        emit.assert_not_called()
        for failure, reason in [(PermissionError(errno.EACCES, "private generation"), "denied"),
                                (FileNotFoundError(errno.ENOENT, "private path"), "missing")]:
            with patch.object(observer.sys, "argv", ["observer"]), \
                    patch.object(observer, "read_private_input", return_value={}), \
                    patch.object(observer, "validate_lease", return_value={"purpose": "probe"}), \
                    patch.object(observer, "bootstrap"), \
                    patch.object(observer, "probe_group", side_effect=failure), \
                    patch.object(observer, "emit") as emit:
                self.assertEqual(observer.main(), 1)
                emit.assert_called_once_with({"kind": "unavailable", "phase": "trace-probe", "reason": reason})

    def test_catchable_cancellation_unwinds_owned_resources(self):
        trace = MagicMock()
        with self.assertRaises(InterruptedError), trace:
            observer.cancel_observer(15, None)
        trace.__exit__.assert_called_once()

    def test_signal_projection_retains_only_owned_pid_candidates(self):
        observation = observer.Observation(10, "/tmp/owned")
        observation.ledger.fork(10, 21, 2)
        observation.ledger.identify(21, 210, "browser", 3)
        observation.ledger.fork(21, 23, 4)
        event = {"targetTid": 23, "generatorTid": 99, "timestampNs": 5000, "signal": 9}
        with patch.object(observer, "emit") as emit, patch.object(observer, "generator_snapshot", return_value={"generatorCategory": "unknown", "generatorCorrelation": "unavailable"}):
            observation.signals([{**event, "targetTid": 55}, event])
            emit.assert_called_once()
            self.assertEqual(emit.call_args.args[0]["correlation"], "pid-only")
            self.assertNotIn("browserPid", emit.call_args.args[0])

    def test_fatal_signal_to_owned_thread_retains_its_process_candidate(self):
        observation = observer.Observation(10, "/tmp/owned")
        observation.ledger.fork(10, 21, 2)
        observation.ledger.identify(21, 210, "browser", 3)
        observation.ledger.fork(21, 23, 4)
        observation.processes(packet(1, [23, 23, 24, 23]))
        with patch.object(observer, "emit") as emit, patch.object(observer, "generator_snapshot", return_value={}):
            observation.signals([{"targetTid": 24, "generatorTid": 99, "timestampNs": 124000}])
            self.assertEqual(emit.call_args.args[0]["targetProcessCandidatePid"], 23)
            self.assertIn(23, observation.signal_targets)
        observation.processes(packet(1, [99, 99, 24, 24], sequence=5))
        self.assertIsNone(observation.ledger.candidate_process_pid(24))

    def test_capability_rejects_time_namespace_or_probe_clock_mismatch(self):
        with patch.object(observer.os, "stat", side_effect=[SimpleNamespace(st_ino=1), SimpleNamespace(st_ino=2)]):
            with self.assertRaisesRegex(ValueError, "namespace mismatch"):
                observer.prove_connector(None)
        probe = MagicMock(pid=21)
        probe.wait.return_value = 23
        for event_time in [9, 15, 21]:
            with self.subTest(event_time=event_time), \
                    patch.object(observer.os, "stat", return_value=SimpleNamespace(st_ino=1)), \
                    patch.object(observer.subprocess, "Popen", return_value=probe), \
                    patch.object(observer.time, "monotonic_ns", side_effect=[10, 20]), \
                    patch.object(observer, "await_event", side_effect=[{"ackError": 0}, {"waitStatus": 23 << 8, "timestampNs": event_time}]):
                if event_time == 15:
                    observer.prove_connector(MagicMock())
                else:
                    with self.assertRaisesRegex(ValueError, "exit mismatch"):
                        observer.prove_connector(MagicMock())

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

    def test_browser_without_network_identity_cannot_satisfy_coverage(self):
        observation = observer.Observation(10, "/tmp/owned")
        observation.ledger.fork(10, 21, 2)
        observation.ledger.identify(21, 210, "browser", 5)
        with patch.object(observer, "emit") as emit:
            self.assertEqual(observation.finish(), 1)
        self.assertEqual(emit.call_args_list[0].args[0]["reason"], "network-service-not-observed")

    def test_network_coverage_survives_pid_reuse_but_requires_a_browser_ancestor(self):
        observation = observer.Observation(10, "/tmp/owned")
        observation.ledger.fork(10, 21, 2)
        observation.ledger.fork(21, 23, 4)
        with patch.object(observer, "identity", side_effect=lambda pid, _: (pid * 10, {21: "browser", 23: "network"}.get(pid, "other"), 5)):
            observation.refresh_identities()
        for pid in [23, 21]:
            observation.ledger.exit({"pid": pid, "tid": pid, "timestampNs": 20, "waitStatus": 0, "parentNotification": 17})
        observation.ledger.fork(99, 21, 30)
        observation.ledger.fork(99, 23, 40)
        with patch.object(observer, "emit") as emit:
            self.assertEqual(observation.finish(), 0)
        emit.assert_called_once_with({"kind": "complete", "incomplete": False})

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
        self.assertEqual(protocol.classify_arguments(browser, root, "/opt/google/chrome/chrome"), "browser")
        self.assertEqual(protocol.classify_arguments(browser.replace(b"owned/", b"unowned/"), root, "/opt/google/chrome/chrome"), "other")
        self.assertEqual(protocol.classify_arguments(browser.replace(b"chrome-Ab12/", b"../"), root, "/opt/google/chrome/chrome"), "other")

    def test_typed_children_never_become_browser_roots_even_with_the_lease(self):
        root = "/tmp/dvt-chromium-network-owned"
        args = b"chrome\0--log-net-log=/tmp/dvt-chromium-network-owned/chrome-Ab12/netlog.json\0--type=utility\0"
        self.assertEqual(protocol.classify_arguments(args, root, "/opt/google/chrome/chrome"), "other")
        self.assertEqual(protocol.classify_arguments(args + b"--utility-sub-type=network.mojom.NetworkService\0", root, "/opt/google/chrome/chrome"), "network")

    def test_network_identity_is_exact_and_truncated_arguments_are_unknown(self):
        args = b"chrome\0--type=utility\0--utility-sub-type=network.mojom.NetworkService\0--private=secret\0"
        self.assertEqual(protocol.classify_arguments(args, "/tmp/owned", "/opt/google/chrome/chrome"), "network")
        self.assertEqual(protocol.classify_arguments(args.replace(b"Service\0", b"ServiceOther\0"), "/tmp/owned", "/opt/google/chrome/chrome"), "other")
        self.assertEqual(protocol.classify_arguments(args[:-1], "/tmp/owned", "/opt/google/chrome/chrome"), "unknown")

    def test_rewritten_linux_title_keeps_unrelated_cypress_quoted_date_opaque(self):
        title = b"/opt/google/chrome/chrome --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT' --log-net-log=/tmp/owned/chrome-Ab12/netlog.json"
        for padding in [b"\0", b"\0" * 100]:
            with self.subTest(padding=len(padding)):
                self.assertEqual(protocol.classify_arguments(title + padding, "/tmp/owned", "/opt/google/chrome/chrome"), "browser")
                network = title + b" --type=utility --utility-sub-type=network.mojom.NetworkService" + padding
                self.assertEqual(protocol.classify_arguments(network, "/tmp/owned", "/opt/google/chrome/chrome"), "network")

    def test_native_executable_excludes_wrapper_and_electron_flag_copies(self):
        args = b"chrome\0--log-net-log=/tmp/owned/chrome-Ab12/netlog.json\0"
        for executable in ["/bin/bash", "/usr/bin/tee", "/opt/Cypress/Cypress"]:
            with self.subTest(executable=executable):
                self.assertEqual(protocol.classify_arguments(args, "/tmp/owned", executable), "other")

    def test_proc_identity_rejects_executable_change_during_snapshot(self):
        stat = "21 (chrome) " + " ".join(["S"] + ["0"] * 18 + ["98765"])
        args = b"chrome\0--log-net-log=/tmp/owned/chrome-Ab12/netlog.json\0"
        with patch.object(observer.Path, "read_text", return_value=stat), \
                patch.object(observer.Path, "open", return_value=io.BytesIO(args)), \
                patch.object(observer.os, "readlink", side_effect=["/opt/google/chrome/chrome", "/bin/bash"]):
            self.assertIsNone(observer.identity(21, "/tmp/owned"))

    def test_ambiguous_identity_markers_never_admit_browser_or_network(self):
        for suffix in [b"--type", b"--type=utility --type=renderer", b"--type='utility'",
                       b'--utility-sub-type="network.mojom.NetworkService"',
                       b"--log-net-log=/tmp/owned/chrome-Ab12/netlog.json --log-net-log=/tmp/other/netlog.json",
                       b"--private='unterminated", b"--type=util\\ity"]:
            with self.subTest(suffix=suffix):
                title = b"/opt/google/chrome/chrome " + suffix + b"\0"
                self.assertEqual(protocol.classify_arguments(title, "/tmp/owned", "/opt/google/chrome/chrome"), "unknown")
        embedded = b"chrome\0--private=x --log-net-log=/tmp/owned/chrome-Ab12/netlog.json\0"
        self.assertEqual(protocol.classify_arguments(embedded, "/tmp/owned", "/opt/google/chrome/chrome"), "other")
        wrong_prefix = b"/bin/bash --log-net-log=/tmp/owned/chrome-Ab12/netlog.json\0"
        self.assertEqual(protocol.classify_arguments(wrong_prefix, "/tmp/owned", "/opt/google/chrome/chrome"), "unknown")

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
        ledger.identify(21, 200, "network", 5)
        self.assertIsNone(ledger.exit({"pid": 21, "tid": 21, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17}))

    def test_browser_identity_propagates_through_zygote_without_relabeling_cypress(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.fork(21, 22, 3)
        ledger.fork(22, 23, 4)
        ledger.identify(23, 230, "network", 5)
        ledger.identify(21, 210, "browser", 6)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "network-service")
        self.assertEqual(event["browserPid"], 21)
        self.assertEqual(event["birthtimeTicks"], 230)
        self.assertEqual(event["signal"], 9)

    def test_nested_browser_candidate_never_replaces_the_owned_browser_root(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.fork(21, 22, 3)
        ledger.fork(22, 23, 4)
        ledger.identify(22, 220, "browser", 5)
        ledger.identify(21, 210, "browser", 6)
        ledger.identify(23, 230, "network", 7)
        for pid, expected in [(23, "network-service"), (22, "owned-child")]:
            event = ledger.exit({"pid": pid, "tid": pid, "timestampNs": 20, "waitStatus": 0, "parentNotification": 17})
            self.assertEqual(event["browserPid"], 21)
            self.assertEqual(event["role"], expected)

    def test_late_outer_browser_does_not_promote_an_earlier_nested_candidate(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.fork(21, 22, 3)
        ledger.identify(22, 220, "browser", 5)
        ledger.identify(21, 210, "browser", 30)
        self.assertIsNone(ledger.exit({"pid": 22, "tid": 22, "timestampNs": 20, "waitStatus": 0, "parentNotification": 17}))

    def test_pid_reuse_never_inherits_network_identity_or_an_old_oom(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network", 5)
        ledger.fork(21, 23, 30)
        candidate = ledger.oom({"victimPid": 23, "timestampNs": 20})
        self.assertEqual(candidate["correlation"], "pid-only")
        self.assertNotIn("birthtimeTicks", candidate)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 40, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "owned-child-unknown")
        self.assertIsNone(event["birthtimeTicks"])

    def test_reused_parent_from_an_unowned_tree_cannot_admit_children(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.exit({"pid": 21, "tid": 21, "timestampNs": 20, "waitStatus": 0, "parentNotification": 17})
        ledger.fork(99, 21, 30)
        ledger.fork(21, 23, 40)
        ledger.identify(23, 230, "network", 45)
        self.assertIsNone(ledger.exit({"pid": 23, "tid": 23, "timestampNs": 50, "waitStatus": 9, "parentNotification": 17}))

    def test_indeterminate_arguments_do_not_erase_same_lifetime_identity(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network", 5)
        ledger.identify(21, 210, "unknown", 10)
        ledger.identify(23, 230, "unknown", 10)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "network-service")

    def test_proc_read_of_a_reused_pid_does_not_erase_an_older_queued_exit(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network", 5)
        ledger.identify(23, 999, "other", 30)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "network-service")
        self.assertEqual(event["birthtimeTicks"], 230)
        self.assertEqual(event["signal"], 9)
        ledger.fork(21, 23, 30)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 40, "waitStatus": 0, "parentNotification": 17})
        self.assertEqual(event["role"], "owned-child-unknown")
        self.assertIsNone(event["birthtimeTicks"])

    def test_first_snapshot_after_exit_cannot_relabel_a_previously_unknown_lifetime(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 999, "network", 30)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "owned-child-unknown")
        self.assertIsNone(event["birthtimeTicks"])
        self.assertNotIn("network-service", ledger.observed_roles(40))
        self.assertNotIn("role", ledger.oom({"victimPid": 23, "timestampNs": 19}))

    def test_late_browser_identity_cannot_admit_earlier_child_events(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "network", 5)
        ledger.identify(21, 210, "browser", 30)
        self.assertIsNone(ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17}))
        self.assertNotIn("network-service", ledger.observed_roles(40))

    def test_role_transition_cannot_borrow_an_earlier_unknown_snapshot_time(self):
        ledger = protocol.OwnedProcesses(10)
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        ledger.fork(21, 23, 4)
        ledger.identify(23, 230, "other", 5)
        ledger.identify(23, 230, "network", 30)
        event = ledger.exit({"pid": 23, "tid": 23, "timestampNs": 20, "waitStatus": 9, "parentNotification": 17})
        self.assertEqual(event["role"], "owned-child-unknown")
        self.assertNotIn("network-service", ledger.observed_roles(40))

    def test_oom_candidate_requires_owned_ledger_but_never_claims_lifetime_correlation(self):
        ledger = protocol.OwnedProcesses(10)
        self.assertIsNone(ledger.oom({"victimPid": 99, "timestampNs": 10}))
        ledger.fork(10, 21, 2)
        ledger.identify(21, 210, "browser", 3)
        event = ledger.oom({"victimPid": 21, "timestampNs": 10})
        self.assertEqual(event, {"kind": "kernel-oom-victim", "victimPid": 21,
                                "timestampNs": 10, "clock": "kernel-log", "correlation": "pid-only"})


if __name__ == "__main__":
    unittest.main()
