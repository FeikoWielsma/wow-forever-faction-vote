import os
import sqlite3
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DB_PATH", BASE_DIR / "wow_vote.db"))
HTML_PATH = BASE_DIR / "index.html"
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

app = FastAPI(title="WoW Forever Faction Vote Simulator")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

DEFAULT_PLAYERS = [
    # Horde (20)
    {"id": 1, "name": "rkkixlol", "faction": "Horde", "c": True, "s": False, "r": False, "is_sodam": False},
    {"id": 2, "name": "drey", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 3, "name": "korovaemae", "faction": "Horde", "c": False, "s": False, "r": False, "is_sodam": False},
    {"id": 4, "name": "xak", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 5, "name": "edd", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 6, "name": "bosse", "faction": "Horde", "c": False, "s": True, "r": False, "is_sodam": False},
    {"id": 7, "name": "bancai", "faction": "Horde", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 8, "name": "raksodwarf", "faction": "Horde", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 9, "name": "Erelja", "faction": "Horde", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 10, "name": "sam", "faction": "Horde", "c": False, "s": False, "r": True, "is_sodam": False},
    {"id": 11, "name": "ayer", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 12, "name": "elstongnome", "faction": "Horde", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 13, "name": "megadave", "faction": "Horde", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 14, "name": "Maxibon", "faction": "Horde", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 15, "name": "scam", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 16, "name": "wondo", "faction": "Horde", "c": True, "s": False, "r": True, "is_sodam": False},
    {"id": 17, "name": "fartlordx", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 18, "name": "Nexu / Deneve", "faction": "Horde", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 19, "name": "Vanargand", "faction": "Horde", "c": True, "s": False, "r": True, "is_sodam": False},
    {"id": 22, "name": "brokest boi", "faction": "Horde", "c": True, "s": True, "r": True, "is_sodam": False},

    # Alliance (22)
    {"id": 20, "name": "sodam", "faction": "Alliance", "c": True, "s": True, "r": True, "is_sodam": True},
    {"id": 21, "name": "falkoro", "faction": "Alliance", "c": False, "s": False, "r": False, "is_sodam": False},
    {"id": 23, "name": "thistlewind", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 24, "name": "neych", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 25, "name": "grimzzy", "faction": "Alliance", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 26, "name": "mcflash", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 27, "name": "monarch", "faction": "Alliance", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 28, "name": "bob", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 29, "name": "Biolume", "faction": "Alliance", "c": False, "s": True, "r": False, "is_sodam": False},
    {"id": 30, "name": "purpleman", "faction": "Alliance", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 31, "name": "yucca", "faction": "Alliance", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 32, "name": "cloggy", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 33, "name": "malc", "faction": "Alliance", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 34, "name": "glen", "faction": "Alliance", "c": False, "s": True, "r": False, "is_sodam": False},
    {"id": 35, "name": "zerodas", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 36, "name": "starfirebeam", "faction": "Alliance", "c": False, "s": True, "r": True, "is_sodam": False},
    {"id": 37, "name": "celth", "faction": "Alliance", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 38, "name": "chobo", "faction": "Alliance", "c": False, "s": False, "r": False, "is_sodam": False},
    {"id": 39, "name": "port", "faction": "Alliance", "c": True, "s": True, "r": True, "is_sodam": False},
    {"id": 40, "name": "droggo", "faction": "Alliance", "c": True, "s": True, "r": False, "is_sodam": False},
    {"id": 41, "name": "atoz", "faction": "Alliance", "c": True, "s": False, "r": False, "is_sodam": False},
    {"id": 42, "name": "noxqs", "faction": "Alliance", "c": False, "s": True, "r": False, "is_sodam": False},
]

DEFAULT_SETTINGS = {
    "w_classic": "1",
    "w_sod": "1",
    "w_retail": "1",
    "voting_mode": "onevote",
}


GCS_BUCKET = os.environ.get("GCS_BUCKET")
_storage_client = None


def get_storage_client():
    global _storage_client
    if _storage_client is None:
        try:
            from google.cloud import storage
            _storage_client = storage.Client()
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize Google Cloud Storage client: {e}")
            return None
    return _storage_client


def sync_from_gcs():
    if not GCS_BUCKET:
        return
    client = get_storage_client()
    if not client:
        return
    try:
        bucket = client.bucket(GCS_BUCKET)
        blob = bucket.blob("wow_vote.db")
        if blob.exists():
            print(f"📥 Downloading latest database from gs://{GCS_BUCKET}/wow_vote.db ...")
            blob.download_to_filename(str(DB_PATH))
            print("✅ Database successfully restored from GCS.")
        else:
            print(f"ℹ️ No database found in gs://{GCS_BUCKET}/wow_vote.db. Initial seed will be uploaded.")
    except Exception as e:
        print(f"⚠️ Warning: Failed to sync database from GCS: {e}")


def sync_to_gcs():
    if not GCS_BUCKET:
        return
    client = get_storage_client()
    if not client:
        return
    try:
        # Checkpoint WAL so that all data is flushed from WAL into the main DB file
        conn = sqlite3.connect(DB_PATH)
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()

        bucket = client.bucket(GCS_BUCKET)
        blob = bucket.blob("wow_vote.db")
        blob.upload_from_filename(str(DB_PATH))
        print(f"📤 Database successfully synced to gs://{GCS_BUCKET}/wow_vote.db")
    except Exception as e:
        print(f"⚠️ Warning: Failed to sync database to GCS: {e}")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    sync_from_gcs()
    conn = get_db()
    seeded = False
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                faction TEXT NOT NULL,
                classic INTEGER NOT NULL DEFAULT 0,
                sod INTEGER NOT NULL DEFAULT 0,
                retail INTEGER NOT NULL DEFAULT 0,
                is_sodam INTEGER NOT NULL DEFAULT 0
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)

        # Check if players table is empty, seed if so
        cur = conn.execute("SELECT COUNT(*) as count FROM players")
        if cur.fetchone()["count"] == 0:
            seeded = True
            for p in DEFAULT_PLAYERS:
                conn.execute(
                    """
                    INSERT INTO players (id, name, faction, classic, sod, retail, is_sodam)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        p["id"],
                        p["name"],
                        p["faction"],
                        1 if p["c"] else 0,
                        1 if p["s"] else 0,
                        1 if p["r"] else 0,
                        1 if p["is_sodam"] else 0,
                    ),
                )

        # Check if settings are seeded
        for k, v in DEFAULT_SETTINGS.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v)
            )

    if seeded:
        sync_to_gcs()


init_db()


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    faction: Optional[str] = None
    c: Optional[bool] = None
    s: Optional[bool] = None
    r: Optional[bool] = None


class PlayerCreate(BaseModel):
    name: str
    faction: str = "Alliance"
    c: bool = False
    s: bool = False
    r: bool = False


class SettingsUpdate(BaseModel):
    w_classic: Optional[float] = None
    w_sod: Optional[float] = None
    w_retail: Optional[float] = None
    voting_mode: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
@app.get("/admin", response_class=HTMLResponse)
@app.get("/manage", response_class=HTMLResponse)
def serve_home():
    if not HTML_PATH.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTML_PATH.read_text(encoding="utf-8")


@app.get("/api/state")
def get_state():
    conn = get_db()
    with conn:
        p_rows = conn.execute("SELECT * FROM players ORDER BY id ASC").fetchall()
        s_rows = conn.execute("SELECT key, value FROM settings").fetchall()

    players = [
        {
            "id": r["id"],
            "name": r["name"],
            "faction": r["faction"],
            "c": bool(r["classic"]),
            "s": bool(r["sod"]),
            "r": bool(r["retail"]),
            "isSodam": bool(r["is_sodam"]),
        }
        for r in p_rows
    ]

    settings = {r["key"]: r["value"] for r in s_rows}
    settings_out = {
        "w_classic": float(settings.get("w_classic", 1)),
        "w_sod": float(settings.get("w_sod", 1)),
        "w_retail": float(settings.get("w_retail", 1)),
        "voting_mode": settings.get("voting_mode", "onevote"),
    }

    return {"players": players, "settings": settings_out}


@app.post("/api/players")
def create_player(player: PlayerCreate):
    name = player.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    if player.faction not in ("Horde", "Alliance", "Abstain"):
        raise HTTPException(status_code=400, detail="Invalid faction")

    conn = get_db()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO players (name, faction, classic, sod, retail, is_sodam)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (
                name,
                player.faction,
                1 if player.c else 0,
                1 if player.s else 0,
                1 if player.r else 0,
            ),
        )
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM players WHERE id = ?", (new_id,)).fetchone()

    sync_to_gcs()

    return {
        "id": row["id"],
        "name": row["name"],
        "faction": row["faction"],
        "c": bool(row["classic"]),
        "s": bool(row["sod"]),
        "r": bool(row["retail"]),
        "isSodam": bool(row["is_sodam"]),
    }


@app.delete("/api/players/{player_id}")
def delete_player(player_id: int):
    conn = get_db()
    with conn:
        cur = conn.execute("DELETE FROM players WHERE id = ?", (player_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Player not found")

    sync_to_gcs()
    return {"status": "deleted", "id": player_id}


@app.patch("/api/players/{player_id}")
def update_player(player_id: int, update: PlayerUpdate):
    conn = get_db()
    with conn:
        cur = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Player not found")

        updates = []
        params = []
        if update.name is not None:
            clean_name = update.name.strip()
            if not clean_name:
                raise HTTPException(status_code=400, detail="Name cannot be empty")
            updates.append("name = ?")
            params.append(clean_name)

        if update.faction is not None:
            if update.faction not in ("Horde", "Alliance", "Abstain"):
                raise HTTPException(status_code=400, detail="Invalid faction")
            updates.append("faction = ?")
            params.append(update.faction)

        if update.c is not None:
            updates.append("classic = ?")
            params.append(1 if update.c else 0)

        if update.s is not None:
            updates.append("sod = ?")
            params.append(1 if update.s else 0)

        if update.r is not None:
            updates.append("retail = ?")
            params.append(1 if update.r else 0)

        if updates:
            params.append(player_id)
            query = f"UPDATE players SET {', '.join(updates)} WHERE id = ?"
            conn.execute(query, tuple(params))

        updated_row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()

    sync_to_gcs()

    return {
        "id": updated_row["id"],
        "name": updated_row["name"],
        "faction": updated_row["faction"],
        "c": bool(updated_row["classic"]),
        "s": bool(updated_row["sod"]),
        "r": bool(updated_row["retail"]),
        "isSodam": bool(updated_row["is_sodam"]),
    }


@app.patch("/api/settings")
def update_settings(update: SettingsUpdate):
    conn = get_db()
    with conn:
        if update.w_classic is not None:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('w_classic', ?)", (str(update.w_classic),))
        if update.w_sod is not None:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('w_sod', ?)", (str(update.w_sod),))
        if update.w_retail is not None:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('w_retail', ?)", (str(update.w_retail),))
        if update.voting_mode is not None:
            if update.voting_mode not in ("weighted", "onevote"):
                raise HTTPException(status_code=400, detail="Invalid voting mode")
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('voting_mode', ?)", (update.voting_mode,))

    sync_to_gcs()

    return {"status": "ok"}


@app.post("/api/reset")
def reset_database():
    raise HTTPException(status_code=403, detail="Reset roster has been permanently disabled.")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    print("🚀 Starting WoW Forever Faction Vote Server...")
    print(f"👉 Open your browser at: http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=(host == "127.0.0.1"))

