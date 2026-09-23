# ⚔️ WoW Forever Faction Vote Simulator

An interactive, live-syncing decision tool and voting simulator built to resolve contested guild faction votes for **WoW Forever** (Classic+, launching November).

Backed by a lightweight local **FastAPI** server and **SQLite** database (`wow_vote.db`) with instant optimistic updates and multi-tab polling sync.

---

## 🌟 Key Features

- **Reconciled Guild Roster (42 members)**: Reconciles all Discord poll voters, spreadsheet sign-ups, alias mappings (`Beccman = Erelja`, `James1406 = Nexu / Deneve`, `Neverbloom = Biolume`), and latest faction switches.
- **Dynamic Era Weighting**: Weight player votes according to game era experience:
  - **Classic 2019**: Historical guild veterans.
  - **Season of Discovery (SoD)**: The closest equivalent to Classic+.
  - **Retail**: Current active roster members.
  - *Included Presets*: Classic+ Focus (2:3:1), Seniority/Loyalty (3:2:1), Recency/Current (1:2:3), Flat (1:1:1), and Equal (2:2:1).
- **1-Vote Per Person Mode**: One-click toggle between full era-weighted voting and traditional single-vote democracy.
- **Per-Person Faction Swapping**: Dropdown switcher (`🔴 Horde`, `🔵 Alliance`, `⚪ Abstain`) to simulate vote flips in real-time.
- **Abstain / Undecided Swing Analysis**: Tracks uncast voting power and dynamically warns if undecided players have enough weight to flip the election.
- **GM Poll Closing Simulator ("Can Sodam Rig the Vote?")**:
  - Analyzes the Guild Master's mathematical leverage via "Optional Stopping" (closing the poll at a favorable peak).
  - Calculates personal swing potential and Monte Carlo timeline fluctuations.
- **SQLite Persistence**: Backed by `wow_vote.db` with WAL mode. Edits save instantly in the background without fragile browser `localStorage`.
- **Google Sheets Export**: One-click clipboard copy to export clean TSV formatted for spreadsheets.

---

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Recommended: [`uv`](https://github.com/astral-sh/uv) (or standard `pip`)

### Running the App

Using `uv` (fastest):
```bash
uv run python server.py
```

Using standard Python:
```bash
pip install -r requirements.txt
python server.py
```

Or on Windows, simply double-click **`run.bat`**.

Then open your browser at:
👉 **[http://localhost:8000](http://localhost:8000)**

### Deploy to Google Cloud (Cloud Run)

The service can be built and deployed directly with `gcloud`:

```bash
gcloud run deploy wow-faction-vote \
  --project=feiko-homepage \
  --region=europe-west4 \
  --source=. \
  --set-env-vars="GCS_BUCKET=wow-vote-data-207474260976" \
  --allow-unauthenticated \
  --max-instances=1
```

Live deployment: 👉 **[https://wow-faction-vote-207474260976.europe-west4.run.app](https://wow-faction-vote-207474260976.europe-west4.run.app)**

---

## 🗄️ Architecture & API

- **Backend**: `server.py` (FastAPI + SQLite3 WAL)
- **Frontend**: `index.html` (Vanilla HTML/CSS/JS, zero heavy frameworks, mobile-responsive)
- **Endpoints**:
  - `GET /` &rarr; Interactive simulator UI
  - `GET /api/state` &rarr; Full roster, weights, and voting mode
  - `PATCH /api/players/{id}` &rarr; Update player faction vote or era checkboxes
  - `PATCH /api/settings` &rarr; Update era weights or voting mode
  - `POST /api/reset` &rarr; Revert database to verified canonical defaults

---

## 📊 Analysis Workbook

The repository also includes [`WoW_Faction_Voting_Analysis.xlsx`](WoW_Faction_Voting_Analysis.xlsx), containing detailed scenario matrices, voter demographics, and breakdown comparisons across all voting systems.
