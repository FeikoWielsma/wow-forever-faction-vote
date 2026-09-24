import importlib.util
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


class DiscordSyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        module_path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("server_under_test", module_path)
        self.server = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, {"DB_PATH": str(Path(self.tmp.name) / "vote.db"), "GCS_BUCKET": ""}):
            spec.loader.exec_module(self.server)
        self.client = TestClient(self.server.app)

    def tearDown(self):
        self.client.close()
        self.tmp.cleanup()

    def mock_discord(self, horde=(), alliance=(), fail=False):
        calls = []

        class Response:
            def __init__(self, data):
                self.data = data

            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def read(self):
                return json.dumps(self.data).encode()

        def fetch(request, timeout=None):
            calls.append(request.full_url)
            if fail:
                raise urllib.error.HTTPError(request.full_url, 429, "rate limited", {}, io.BytesIO())
            if "/answers/1" in request.full_url:
                return Response({"users": list(horde)})
            if "/answers/2" in request.full_url:
                return Response({"users": list(alliance)})
            return Response({"nick": "rkkixlol"})

        return calls, fetch

    def sync(self, fetch):
        with patch.dict(os.environ, {"DISCORD_BOT_TOKEN": "test", "SYNC_TOKEN": "test-secret"}):
            with patch.object(self.server.urllib.request, "urlopen", side_effect=fetch):
                return self.client.post("/api/discord/sync", headers={"X-Sync-Token": "test-secret"})

    def test_faction_change_and_withdrawal_are_logged_once(self):
        voter = {"id": "123", "username": "rkkixlol"}
        calls, fetch = self.mock_discord(horde=[voter])
        response = self.sync(fetch)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["changed"])
        self.assertEqual(len(calls), 3)

        calls, fetch = self.mock_discord(horde=[voter])
        response = self.sync(fetch)
        self.assertFalse(response.json()["changed"])
        self.assertEqual(len(calls), 2)

        _, fetch = self.mock_discord(alliance=[voter])
        self.assertEqual(self.sync(fetch).status_code, 200)
        _, fetch = self.mock_discord()
        self.assertEqual(self.sync(fetch).status_code, 200)
        self.assertFalse(self.sync(fetch).json()["changed"])

        history = self.client.get("/api/history").json()
        self.assertEqual([event["new_faction"] for event in history[:2]], ["Abstain", "Alliance"])

    def test_api_failure_does_not_erase_votes(self):
        voter = {"id": "123", "username": "rkkixlol"}
        _, fetch = self.mock_discord(horde=[voter])
        self.assertEqual(self.sync(fetch).status_code, 200)
        _, fetch = self.mock_discord(fail=True)
        self.assertEqual(self.sync(fetch).status_code, 429)
        state = self.client.get("/api/state").json()
        self.assertEqual(next(p for p in state["players"] if p["id"] == 1)["faction"], "Horde")
        self.assertEqual(self.client.get("/api/history").json(), [])

    def test_sync_requires_token(self):
        with patch.dict(os.environ, {"SYNC_TOKEN": "test-secret"}):
            self.assertEqual(self.client.post("/api/discord/sync").status_code, 401)

    def test_admin_password_allows_sync_without_token(self):
        calls, fetch = self.mock_discord()
        env = {"DISCORD_BOT_TOKEN": "test", "SYNC_TOKEN": "test-secret", "ADMIN_PASSWORD": "pw"}
        with patch.dict(os.environ, env):
            with patch.object(self.server.urllib.request, "urlopen", side_effect=fetch):
                response = self.client.post("/api/discord/sync", auth=("admin", "pw"))
        self.assertEqual(response.status_code, 200)


class AdminAuthTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        module_path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("server_under_test", module_path)
        self.server = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, {"DB_PATH": str(Path(self.tmp.name) / "vote.db"), "GCS_BUCKET": ""}):
            spec.loader.exec_module(self.server)
        self.client = TestClient(self.server.app)
        self.env = patch.dict(os.environ, {"ADMIN_PASSWORD": "pw"})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.client.close()
        self.tmp.cleanup()

    def test_public_pages_stay_open(self):
        for path in ("/", "/history", "/api/state", "/api/history"):
            self.assertEqual(self.client.get(path).status_code, 200, path)

    def test_admin_page_requires_password(self):
        response = self.client.get("/admin")
        self.assertEqual(response.status_code, 401)
        self.assertIn("Basic", response.headers["WWW-Authenticate"])
        self.assertEqual(self.client.get("/admin", auth=("x", "wrong")).status_code, 401)
        self.assertEqual(self.client.get("/admin", auth=("x", "pw")).status_code, 200)

    def test_writes_require_password(self):
        self.assertEqual(self.client.patch("/api/players/1", json={"faction": "Alliance"}).status_code, 401)
        self.assertEqual(self.client.post("/api/players", json={"name": "intruder"}).status_code, 401)
        self.assertEqual(self.client.delete("/api/players/1").status_code, 401)
        self.assertEqual(self.client.patch("/api/settings", json={"voting_mode": "weighted"}).status_code, 401)
        ok = self.client.patch("/api/players/1", json={"faction": "Alliance"}, auth=("x", "pw"))
        self.assertEqual(ok.status_code, 200)

    def test_admin_refused_when_password_not_configured(self):
        with patch.dict(os.environ, {"ADMIN_PASSWORD": ""}):
            self.assertEqual(self.client.get("/admin", auth=("x", "")).status_code, 503)


if __name__ == "__main__":
    unittest.main()
