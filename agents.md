# 🤖 AGENTS.MD — System Architecture & Agent Guidelines

This document provides complete technical reference and guidelines for AI agents working on the **WoW Forever Faction Vote** codebase.

---

## 1. Project Purpose & Overview

The **WoW Forever Faction Vote** application is an interactive decision simulator, live election dashboard, and audit logger built for the **WoW Forever** guild community (Classic+, launching November). 

The guild faced a split vote between Horde (🔴) and Alliance (🔵). This application:
1. Reconciles live Discord poll votes with the guild roster.
2. Models era-weighted voting power (Classic 2019, Season of Discovery, Retail) vs. 1-vote-per-person democracy.
3. Provides a CNN/US Election-style Azeroth electoral map (Eastern Kingdoms & Kalimdor) with swing-state districts and battleground analytics.
4. Includes a dedicated live audit trail (`/history`) tracking every faction defection, timestamp, and source (Discord native poll sync vs. Admin edits).
5. Easter egg: Includes a "Jeb!" celebratory landslide mode.

---

## 2. Technology Stack & Architecture

- **Backend**: Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/), Uvicorn.
- **Database**: SQLite3 with Write-Ahead Logging (`PRAGMA journal_mode=WAL`).
- **Cloud Persistence**: Optional Google Cloud Storage bucket sync (`GCS_BUCKET`). SQLite database is downloaded from GCS on startup (if missing locally) and uploaded to GCS on state mutations.
- **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript. Zero build steps, zero node dependencies, zero bundlers.
- **Canvas Rendering**: HTML5 2D Canvas for rendering high-resolution Azeroth cartography and interactive district states.
- **Hosting**: Google Cloud Run (`europe-west4`, GCP project `feiko-homepage`), containerized via Dockerfile.

---

## 3. Directory & File Structure

```
├── server.py             # FastAPI backend, SQLite connection, Discord API sync, REST endpoints
├── index.html            # Main SPA: Public view, Admin management panel, Azeroth election map
├── history.html          # Faction Defection & Vote History audit timeline view
├── wow_vote.db           # SQLite database (auto-generated, WAL mode)
├── requirements.txt      # Python dependencies (fastapi, uvicorn, pydantic, google-cloud-storage)
├── pyproject.toml        # uv package configuration
├── Dockerfile            # Cloud Run container definition (python:3.11-slim)
├── .dockerignore         # Docker build exclusions
├── .gitignore            # Git exclusions (db files, venvs, cache)
├── run.bat               # Windows quick-launch script
├── WoW_Faction_Voting_Analysis.xlsx # Historical reference models and scenario workbook
├── README.md             # Public project documentation
├── agents.md             # This agent operating manual
└── handover.md           # Project state, live links, and handover notes
```

---

## 4. Database Schema

The SQLite database (`wow_vote.db`) has three tables:

### `players`
Represents guild members eligible to vote.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL UNIQUE)
- `faction` (TEXT NOT NULL): `'Horde'`, `'Alliance'`, or `'Abstain'`
- `c2019` (INTEGER NOT NULL DEFAULT 0): 1 if played Classic 2019, 0 otherwise
- `sod` (INTEGER NOT NULL DEFAULT 0): 1 if played Season of Discovery, 0 otherwise
- `retail` (INTEGER NOT NULL DEFAULT 0): 1 if active in Retail, 0 otherwise
- `sort_order` (INTEGER NOT NULL DEFAULT 0)

### `settings`
Stores simulation configuration parameters.
- `key` (TEXT PRIMARY KEY)
- `value` (TEXT NOT NULL)
- Keys used:
  - `c2019_weight`: Era weight integer (e.g. `2`)
  - `sod_weight`: Era weight integer (e.g. `3`)
  - `retail_weight`: Era weight integer (e.g. `1`)
  - `voting_mode`: `'era'` (era-weighted) or `'flat'` (1 person = 1 vote)

### `vote_history`
Maintains an immutable audit log of vote flips, player additions, removals, and sync events.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `player_id` (INTEGER NULLABLE)
- `player_name` (TEXT NOT NULL)
- `old_faction` (TEXT NULLABLE): Faction before event (`'Horde'`, `'Alliance'`, `'Abstain'`, or `NULL`)
- `new_faction` (TEXT NOT NULL): Resulting faction (`'Horde'`, `'Alliance'`, `'Abstain'`, or `'Removed'`)
- `changed_by` (TEXT NOT NULL DEFAULT 'admin'): Source identifier (`'discord_sync'`, `'admin'`, or `'initial'`)
- `timestamp` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `details` (TEXT NULLABLE): Context explanation (e.g., Discord username/nickname)

---

## 5. Discord Poll Integration

### Guild & Poll Identifiers
- **Guild ID**: `1172965723467956365`
- **Channel ID**: `1548578917965635675` (`#sign-up-forever`)
- **Poll Message ID**: `1548585777326329887`

### Technical Discovery: Discord Native Polls
The guild faction poll is an **official native Discord Poll**, NOT an emoji reaction message and NOT a third-party bot (like Raid-Helper).

> [!IMPORTANT]
> **API Specifics for Native Discord Polls**:
> 1. Calling standard message endpoints `GET /channels/{c_id}/messages/{m_id}` will **NOT** return poll voters if the bot lacks privileged `MESSAGE_CONTENT` gateway intents.
> 2. Discord exposes a dedicated public sub-resource endpoint:
>    `GET /channels/{channel_id}/polls/{message_id}/answers/{answer_id}?limit=100`
>    - **Answer ID 1**: Horde (🔴)
>    - **Answer ID 2**: Alliance (🔵)
> 3. This sub-resource endpoint requires only standard `bot` authorization (`Bot <token>`) and returns `{ "users": [ ... ] }` containing all voters for that choice.

### Member Nickname & Alias Matching Pipeline
Discord users frequently use server nicknames or handles differing from their in-game characters. The sync engine (`sync_discord_votes()` in `server.py`) operates as follows:

1. **Member Cache**: Fetches guild members from `GET /guilds/{g_id}/members?limit=1000` to map `user_id` to server `nick`, global `global_name`, and base `username`.
2. **Unicode Normalization (`normalize_name`)**:
   - Performs NFKD decomposition: `unicodedata.normalize("NFKD", s)`.
   - Strips accents/diacritics (e.g. `Denevê` &rarr; `Deneve`).
   - Lowercases and strips spaces, periods, underscores, and slashes.
3. **Special Guild Aliases**:
   - `Agravain` &harr; `Xak` / `Laneyr`
   - `Tom` &harr; `Fartlordx` / `tomtheswagboii`
   - `Marsian` &harr; `Purpleman`
   - `slavedemorto` &harr; `Brokest`
   - `Erelja` &harr; `Erellja` / `Beccman`
   - `James1406` &harr; `Nexu` / `Deneve`
   - `Neverbloom` &harr; `Biolume`
   - `dwarfoskar` &harr; `Raksodwarf`
   - `Edd` &harr; `whu2625`
4. **Audit Logging**: Any detected faction change during sync is recorded in `vote_history` with `changed_by = 'discord_sync'`.

---

## 6. Endpoints & Routes

| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/` | Main public application (Map + Simulator) | Public |
| `GET` | `/admin` | Main application with admin controls enabled | Admin |
| `GET` | `/history` | Dedicated Vote History and defection tracker | Public |
| `GET` | `/api/state` | Returns roster (`players`), weights, and voting mode | Public |
| `PATCH` | `/api/players/{id}` | Updates faction, era checkboxes, or name | Admin |
| `POST` | `/api/players` | Adds a new player to the roster | Admin |
| `DELETE` | `/api/players/{id}` | Removes a player from the roster | Admin |
| `PATCH` | `/api/settings` | Updates era weights or voting mode | Admin |
| `POST` | `/api/reset` | **DISABLED (403 Forbidden)** to protect live data | Disabled |
| `POST` | `/api/discord/sync` | Queries Discord native poll and syncs roster | Admin |
| `GET` | `/api/history` | Returns vote audit records (limit param supported) | Public |

---

## 7. Operating Rules for AI Agents

1. **Strict Secret Management**:
   - **NEVER** commit Discord Bot Tokens, API keys, or service account credentials into Git commits, PRs, or public files.
   - Use the environment variable `DISCORD_BOT_TOKEN`.
   - GitHub secret scanning immediately flags and rejects commits containing Discord tokens.
2. **Never Re-Enable Reset Roster**:
   - The reset button was permanently removed and the endpoint returns `403 Forbidden`. The live roster contains production community state. Do not add reset buttons back.
3. **Cloud Run Concurrency & Instance Limits**:
   - Always deploy Cloud Run with `--max-instances=1` because state is stored in SQLite backed by GCS syncing. Running multiple instances will cause divergent local SQLite instances.
4. **Codebase Cleanliness & Simplicity**:
   - Maintain the single-file UI architecture (`index.html` and `history.html`). Do not introduce Webpack, Vite, React, or TypeScript build steps unless explicitly requested by the user.
5. **Forgejo / Git Preferences**:
   - When interacting with Forgejo, always use host `-H git.feikowielsma.nl`.
