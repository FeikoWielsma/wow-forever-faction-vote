import sqlite3
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "wow_vote.db"
HTML_PATH = BASE_DIR / "index.html"

app = FastAPI(title="WoW Forever Faction Vote Simulator")

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
    "w_classic": "2",
    "w_sod": "3",
    "w_retail": "1",
    "voting_mode": "weighted",
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
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


init_db()


class PlayerUpdate(BaseModel):
    faction: Optional[str] = None
    c: Optional[bool] = None
    s: Optional[bool] = None
    r: Optional[bool] = None


class SettingsUpdate(BaseModel):
    w_classic: Optional[float] = None
    w_sod: Optional[float] = None
    w_retail: Optional[float] = None
    voting_mode: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
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
        "w_classic": float(settings.get("w_classic", 2)),
        "w_sod": float(settings.get("w_sod", 3)),
        "w_retail": float(settings.get("w_retail", 1)),
        "voting_mode": settings.get("voting_mode", "weighted"),
    }

    return {"players": players, "settings": settings_out}


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

    return {"status": "ok"}


@app.post("/api/reset")
def reset_database():
    conn = get_db()
    with conn:
        conn.execute("DELETE FROM players")
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

        conn.execute("DELETE FROM settings")
        for k, v in DEFAULT_SETTINGS.items():
            conn.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))

    return {"status": "reset_successful"}


if __name__ == "__main__":
    print("🚀 Starting WoW Forever Faction Vote Server...")
    print("👉 Open your browser at: http://localhost:8000")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
