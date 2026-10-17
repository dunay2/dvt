"""Owned concern: bounded userspace OOM journal projection and disclosure."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "apps/web/cypress/node/linuxChromiumOomJournal.py"
SPEC = importlib.util.spec_from_file_location("oom_journal", SOURCE)
journal = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(journal)


def entry(daemon, message, **extra):
    return {"_COMM": daemon, "_SYSTEMD_UNIT": daemon + ".service", "_PID": "12", "__MONOTONIC_TIMESTAMP": "150", "_BOOT_ID": "a" * 32, "MESSAGE": message, **extra}


class OomJournalTest(unittest.TestCase):
    def test_earlyoom_attempt_is_not_claimed_as_success_and_private_text_is_dropped(self):
        event = journal.project_oom_entry(entry("earlyoom", 'sending SIGKILL to process 23 uid 1000 "secret": cmdline "token"'), "a" * 32, 100000, 200000, lambda pid: pid == 23)
        self.assertEqual(event, {"kind": "userspace-oom-report", "daemon": "earlyoom", "daemonPid": 12,
            "timestampNs": 150000, "action": "signal-attempt", "signal": 9, "victimPid": 23, "correlation": "pid-only"})
        self.assertIsNone(journal.project_oom_entry(entry("earlyoom", "sending SIGKILL to process 99 uid 1 private"), "a" * 32, 100000, 200000, lambda _: False))

    def test_systemd_cgroup_report_is_not_process_attribution(self):
        event = journal.project_oom_entry(entry("systemd-oomd", "Killed /private/project due to memory pressure for /private being 80%"), "a" * 32, 100000, 200000, lambda _: False)
        self.assertEqual(event["action"], "cgroup-kill-report")
        self.assertEqual(event["correlation"], "runner-interval-only")
        self.assertNotIn("victimPid", event)
        self.assertNotIn("private", json.dumps(event))

    def test_wrong_boot_outside_interval_forged_daemon_and_unrecognized_text_do_not_attribute(self):
        base = entry("systemd-oomd", "Killed /x due to memory used (1) / total (2)")
        for changed in [{"_BOOT_ID": "b" * 32}, {"__MONOTONIC_TIMESTAMP": "201"}, {"_COMM": "other"}, {"_SYSTEMD_UNIT": "other.service"}, {"MESSAGE": "Would have killed /x"}]:
            with self.subTest(changed=changed):
                self.assertIsNone(journal.project_oom_entry({**base, **changed}, "a" * 32, 100000, 200000, lambda _: True))

    def test_duplicate_or_malformed_fields_cannot_be_silently_projected(self):
        for changed in [{"_PID": ["12", "13"]}, {"__MONOTONIC_TIMESTAMP": "bad"}, {"MESSAGE": [12, 13]}]:
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                journal.project_oom_entry(entry("earlyoom", "message", **changed), "a" * 32, 0, 999999, lambda _: True)

    def test_query_is_cursor_scoped_bounded_and_reports_empty_as_not_observed(self):
        baseline = json.dumps({"__CURSOR": "s=test;i=1", "_BOOT_ID": "a" * 32}).encode() + b"\n"
        with patch.object(journal, "read_journal", side_effect=[baseline, b""]) as read:
            capture = journal.OomJournal()
            records = capture.finish(lambda _: False)
            args = read.call_args_list[1].args[0]
            self.assertIn("--after-cursor=s=test;i=1", args)
            self.assertIn("--lines=201", args)
            self.assertIn("--unit=systemd-oomd.service", args)
            self.assertIn("--unit=earlyoom.service", args)
            self.assertEqual(records[-1]["kind"], "userspace-oom-coverage")
            self.assertEqual(records[-1]["entriesRead"], 0)

    def test_empty_baseline_or_truncated_journal_cannot_claim_coverage(self):
        with patch.object(journal, "read_journal", return_value=b""), self.assertRaises(ValueError):
            journal.OomJournal()
        baseline = json.dumps({"__CURSOR": "s=test;i=1", "_BOOT_ID": "a" * 32}).encode() + b"\n"
        with patch.object(journal, "read_journal", side_effect=[baseline, b"{}\n" * 201]):
            capture = journal.OomJournal()
            with self.assertRaises(ValueError):
                capture.finish(lambda _: True)


if __name__ == "__main__":
    unittest.main()
