"""Owned concern: private SIGKILL trace decoding, scope and lifecycle."""
import importlib.util
from pathlib import Path
import tempfile
import stat
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

SOURCE = Path(__file__).resolve().parents[1] / "apps/web/cypress/node/linuxChromiumSignalTrace.py"
SPEC = importlib.util.spec_from_file_location("signal_trace", SOURCE)
trace = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(trace)


class SignalTraceTest(unittest.TestCase):
    def test_foreign_trace_inode_is_denied_before_any_mutation(self):
        receipt = {"generation": "unit-owned", "rootKind": "tracefs", "name": "dvt-signal-unit-owned", "device": "1", "inode": "2"}
        with patch.object(trace.os, "O_DIRECTORY", 0, create=True), patch.object(trace.os, "O_NOFOLLOW", 0, create=True), \
                patch.object(trace.os, "open", side_effect=[40, 41]), \
                patch.object(trace.os, "fstat", return_value=SimpleNamespace(st_mode=stat.S_IFDIR, st_uid=0, st_dev=1, st_ino=99)), \
                patch.object(trace.os, "close"), patch.object(trace.os, "write") as write, \
                patch.object(trace.os, "rmdir") as remove, self.assertRaisesRegex(ValueError, "Foreign"):
            trace.dispose_owned_trace(receipt)
        write.assert_not_called()
        remove.assert_not_called()

    def test_disposal_requires_exact_private_name_and_revalidates_before_rmdir(self):
        receipt = {"generation": "unit-owned", "rootKind": "tracefs", "name": "dvt-signal-unit-owned", "device": "1", "inode": "2"}
        for bad in [{**receipt, "name": "../foreign"}, {**receipt, "rootKind": "arbitrary"}]:
            with patch.object(trace.os, "open") as opened, self.assertRaises(ValueError):
                trace.dispose_owned_trace(bad)
            opened.assert_not_called()
        identity = SimpleNamespace(st_mode=stat.S_IFDIR, st_uid=0, st_dev=1, st_ino=2)
        with patch.object(trace.os, "O_DIRECTORY", 0, create=True), patch.object(trace.os, "O_NOFOLLOW", 0, create=True), \
                patch.object(trace.os, "open", side_effect=[40, 41, 42]) as opened, \
                patch.object(trace.os, "fstat", return_value=identity), \
                patch.object(trace.os, "stat", return_value=identity), patch.object(trace.os, "close") as close, \
                patch.object(trace.os, "write") as write, patch.object(trace.os, "rmdir") as remove:
            self.assertEqual(trace.dispose_owned_trace(receipt), "removed")
            self.assertEqual(opened.call_args_list[2].args[0], "tracing_on")
            write.assert_called_once_with(42, b"0")
            remove.assert_called_once_with("dvt-signal-unit-owned", dir_fd=40)
            self.assertEqual([call.args[0] for call in close.call_args_list], [42, 41, 40])
        with patch.object(trace.os, "O_DIRECTORY", 0, create=True), patch.object(trace.os, "O_NOFOLLOW", 0, create=True), \
                patch.object(trace.os, "open", side_effect=[40, 41, 42]), patch.object(trace.os, "fstat", return_value=identity), \
                patch.object(trace.os, "stat", return_value=SimpleNamespace(st_dev=1, st_ino=99)), \
                patch.object(trace.os, "close"), patch.object(trace.os, "write"), patch.object(trace.os, "rmdir") as remove, \
                self.assertRaisesRegex(ValueError, "changed"):
            trace.dispose_owned_trace(receipt)
        remove.assert_not_called()

    def test_missing_acquired_instance_is_idempotent_without_guessing_other_names(self):
        receipt = {"generation": "unit-owned", "rootKind": "tracefs", "name": "dvt-signal-unit-owned", "device": "1", "inode": "2"}
        with patch.object(trace.os, "O_DIRECTORY", 0, create=True), patch.object(trace.os, "O_NOFOLLOW", 0, create=True), \
                patch.object(trace.os, "open", side_effect=[40, FileNotFoundError]), \
                patch.object(trace.os, "close"), patch.object(trace.os, "rmdir") as remove:
            self.assertEqual(trace.dispose_owned_trace(receipt), "absent")
        remove.assert_not_called()

    def test_generation_metadata_does_not_export_process_names(self):
        event = trace.decode_signal_line(
            b" Chrome_IOThread-123 [002] d..2. 100.123456: signal_generate: sig=9 errno=0 code=0 comm=private token pid=456 grp=1 res=0")
        self.assertEqual(event, {"generatorTid": 123, "targetTid": 456,
            "timestampNs": 100123456000, "precisionNs": 1000,
            "signal": 9, "signalCode": 0, "signalErrno": 0, "group": True, "result": 0})

    def test_kernel_context_and_non_delivery_results_remain_explicit(self):
        event = trace.decode_signal_line(
            b" <idle>-0 [000] d... 2.000000123: signal_generate: sig=9 errno=0 code=128 comm=x pid=55 grp=0 res=2")
        self.assertEqual((event["generatorTid"], event["signalCode"], event["result"]), (0, 128, 2))
        self.assertEqual(event["precisionNs"], 1)

    def test_lost_unsupported_and_malformed_records_reject(self):
        for line in [b"CPU:2 [LOST 7 EVENTS]", b"garbage", b"x-1 [0] d.. 1.000000: signal_generate: sig=15 errno=0 code=0 comm=x pid=2 grp=1 res=0"]:
            with self.subTest(line=line), self.assertRaises(ValueError):
                trace.decode_signal_line(line)

    def test_stream_handles_partial_lines_and_rejects_truncated_tail(self):
        stream = trace.SignalLines()
        self.assertEqual(stream.feed(b"x-1 [0] d.. 1.000"), [])
        events = stream.feed(b"000: signal_generate: sig=9 errno=0 code=0 comm=x pid=2 grp=1 res=0\n")
        self.assertEqual(events[0]["targetTid"], 2)
        stream.finish()
        stream.feed(b"unfinished")
        with self.assertRaises(ValueError):
            stream.finish()
        with self.assertRaises(ValueError):
            trace.SignalLines().feed(b"x" * 65537)

    def test_loss_statistics_require_all_counters(self):
        stats = "entries: 0\noverrun: 0\ncommit overrun: 0\ndropped events: 0\nread events: 5\n"
        trace.assert_no_trace_loss(stats)
        for broken in [stats.replace("overrun: 0", "overrun: 1", 1), "overrun: 0"]:
            with self.assertRaises(ValueError):
                trace.assert_no_trace_loss(broken)

    def test_denied_trace_instance_does_not_mutate_global_tracing(self):
        with tempfile.TemporaryDirectory() as root:
            directory = Path(root)
            (directory / "tracing_on").write_text("1")
            with self.assertRaises(OSError):
                with trace.SignalTrace("unit-owned", lambda _: None, directory):
                    self.fail("missing mounted instances must reject")
            self.assertEqual((directory / "tracing_on").read_text(), "1")

    def test_generator_snapshot_is_explicitly_uncertain_and_never_exports_path(self):
        with patch.object(trace, "read_generator_snapshot", return_value=(51, 123, "/private/chrome")):
            self.assertEqual(trace.generator_snapshot(55), {
                "generatorSnapshotPid": 51, "generatorSnapshotBirthtimeTicks": 123,
                "generatorCategory": "chromium", "generatorCorrelation": "pid-only-after-event"})
        with patch.object(trace, "read_generator_snapshot", side_effect=OSError):
            self.assertEqual(trace.generator_snapshot(55), {"generatorCategory": "unknown", "generatorCorrelation": "unavailable"})

    def test_end_of_stopped_trace_is_drained_not_a_busy_loop(self):
        capture = trace.SignalTrace("unit-owned", lambda _: None)
        capture.fd = 7
        with patch.object(trace.os, "read", return_value=b""), self.assertRaises(BlockingIOError):
            capture.read()

    def test_private_instance_closes_descriptor_and_removes_only_itself_on_failure(self):
        capture = trace.SignalTrace("unit-owned", lambda _: None)
        capture.instance = MagicMock()
        capture.fd = 42
        capture.lifetime_fd = 43
        capture.root = Path("unused")
        capture.root_kind = "tracefs"
        capture.receipt = {"generation": "unit-owned"}
        with patch.object(capture, "write") as write, patch.object(trace.os, "close", side_effect=[OSError("close failed"), None]) as close, \
                patch.object(trace, "dispose_owned_trace") as dispose:
            with self.assertRaises(OSError):
                capture.__exit__(None, None, None)
            self.assertEqual([call.args[0] for call in close.call_args_list], [42, 43])
        dispose.assert_called_once_with(capture.receipt, {"tracefs": capture.root})
        write.assert_not_called()
        self.assertIsNone(capture.instance)

    def test_normal_exit_never_writes_a_replaced_instance_before_the_identity_guard(self):
        capture = trace.SignalTrace("unit-owned", lambda _: None)
        capture.instance = Path("unused")
        capture.root = Path("unused-root")
        capture.root_kind = "tracefs"
        capture.receipt = {"generation": "unit-owned", "rootKind": "tracefs", "name": "dvt-signal-unit-owned", "device": "1", "inode": "2"}
        with patch.object(capture, "write", side_effect=AssertionError("unguarded path mutation")) as write, \
                patch.object(trace.os, "O_DIRECTORY", 0, create=True), patch.object(trace.os, "O_NOFOLLOW", 0, create=True), \
                patch.object(trace.os, "open", side_effect=[40, 41]), patch.object(trace.os, "close"), \
                patch.object(trace.os, "fstat", return_value=SimpleNamespace(st_mode=stat.S_IFDIR, st_uid=0, st_dev=1, st_ino=99)), \
                patch.object(trace.os, "write") as mutation, patch.object(trace.os, "rmdir") as remove, \
                self.assertRaisesRegex(ValueError, "Foreign"):
            capture.__exit__(None, None, None)
        write.assert_not_called()
        mutation.assert_not_called()
        remove.assert_not_called()

    def test_probe_requires_observed_signal_and_matching_exit(self):
        probe = MagicMock(pid=23)
        probe.wait.return_value = -9
        capture = trace.SignalTrace("unit-owned", lambda _: None)
        capture.fd = 7
        event = {"generatorTid": 10, "targetTid": 23, "signalCode": 0,
                 "result": 0, "timestampNs": 123000, "precisionNs": 1000}
        with patch.object(trace.subprocess, "Popen", return_value=probe), \
                patch.object(trace.os, "getpid", return_value=10), \
                patch.object(trace.time, "monotonic_ns", side_effect=[122500, 125000]), \
                patch.object(trace.select, "select", return_value=([7], [], [])), \
                patch.object(capture, "read", return_value=[event]):
            capture.prove()
        probe.kill.assert_called_once_with()
        probe.stdin.close.assert_called_once_with()
        with patch.object(trace.subprocess, "Popen", return_value=probe), \
                patch.object(trace.select, "select", return_value=([], [], [])), self.assertRaises(ValueError):
            capture.prove()

    def test_snapshot_refuses_pid_reuse(self):
        directory = MagicMock()
        stat = directory.__truediv__.return_value
        stat.read_text.side_effect = ["1 (x) " + "0 " * 19 + "100", "Tgid:\t5\n", "1 (x) " + "0 " * 19 + "101"]
        with patch.object(trace, "Path") as path, patch.object(trace.os, "readlink", return_value="/bin/chrome"):
            path.return_value.__truediv__.return_value = directory
            with self.assertRaises(ValueError):
                trace.read_generator_snapshot(5)


if __name__ == "__main__":
    unittest.main()
