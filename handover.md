# 📋 HANDOVER.MD — Project State & Handover Notes

**Project:** WoW Forever Faction Vote Simulator & Election Map  
**Repository:** `C:\Git\wow-forever-faction-vote` (Branch: `main`)  
**Last Updated:** September 23, 2026  

---

## 1. Current State & Deliverables

The application is in active production use by the guild leadership and community to track, visualize, and decide the faction for WoW Forever (Classic+).

### Key Features Delivered:
1. **Interactive Azeroth Election Map**:
   - CNN / US Presidential Election-style map covering Eastern Kingdoms and Kalimdor.
   - 12 historical Warcraft districts (Durotar, Barrens, Mulgore, Tirisfal, Silverpine, Dun Morogh, Elwynn Forest, Westfall, Redridge, Stranglethorn Vale, Tanaris, Winterspring).
   - District electors, winner-takes-all electoral college math, and "Too Close to Call / Battleground" status indicators.
2. **Jeb! Landslide Celebration Mode**:
   - One-click "Jeb!" button that turns every single district on Kalimdor and Eastern Kingdoms to Jeb! with celebratory fanfare and image.
3. **Native Discord Poll Integration**:
   - Clarified and resolved that the vote is an official **Discord Native Poll** (message `1548585777326329887` in `#sign-up-forever`), not emoji reactions or Raid Helper.
   - Implemented direct querying of Discord's `/channels/{id}/polls/{id}/answers/{aid}` endpoint (Answer 1 = Horde, Answer 2 = Alliance).
   - Added automated member nickname normalization and special guild alias matching (resolves 41+ of 42 members automatically).
4. **Dedicated Vote History & Defection Tracker (`/history`)**:
   - Separate web page providing a real-time audit log of all vote swaps and roster adjustments.
   - Displays player name, time, directional transition (e.g. `🔴 Horde ➔ 🔵 Alliance`), source (`🤖 Discord Poll` vs. `👤 Admin Panel`), and contextual details.
   - Includes stat counters (Horde &rarr; Alliance, Alliance &rarr; Horde, Swapped to Abstain) and filter controls.
   - Auto-refreshes every 4 seconds.
5. **Roster Protection & GM Meme Clean-Up**:
   - Removed the "GM Power / Rig Vote" simulator module per user request.
   - The "Reset Roster" functionality remains permanently disabled and removed to protect community data.

---

## 2. Live Deployments & URLs

| Service / View | URL | Notes |
|---|---|---|
| **Public Election App** | [https://wow-faction-vote-207474260976.europe-west4.run.app](https://wow-faction-vote-207474260976.europe-west4.run.app) | Read-only public view with election map & era simulator |
| **Admin Management View** | [https://wow-faction-vote-207474260976.europe-west4.run.app/admin](https://wow-faction-vote-207474260976.europe-west4.run.app/admin) | Full roster management & Discord poll sync trigger |
| **Vote History Audit** | [https://wow-faction-vote-207474260976.europe-west4.run.app/history](https://wow-faction-vote-207474260976.europe-west4.run.app/history) | Live defection tracker and audit log |

### Google Cloud Infrastructure
- **GCP Project**: `feiko-homepage`
- **Region**: `europe-west4` (Eemshaven / Netherlands)
- **Cloud Run Service**: `wow-faction-vote`
- **GCS Persistence Bucket**: `wow-vote-data-207474260976` (stores `wow_vote.db` snapshot)
- **Max Instances**: `1` (required to prevent multi-instance SQLite concurrency drift)

---

## 3. Environment Variables & Credentials

| Variable | Description | Example / Location |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Bot token used to query the Discord Poll API | Configured in Cloud Run & developer environment (NEVER commit to git) |
| `GCS_BUCKET` | Google Cloud Storage bucket for DB persistence | `wow-vote-data-207474260976` |
| `PORT` | Web server listening port | `8080` (Cloud Run default) / `8000` (Local) |
| `DISCORD_CHANNEL_ID` | Guild channel ID for signups | `1548578917965635675` |
| `DISCORD_MESSAGE_ID` | Message ID of the native poll | `1548585777326329887` |

---

## 4. Discord Poll Sync Specifications

- **Guild**: `1172965723467956365`
- **Channel**: `1548578917965635675` (`#sign-up-forever`)
- **Poll Message ID**: `1548585777326329887`
- **Poll Tally at Handover**:
  - Horde (Answer ID `1`): 22 voters
  - Alliance (Answer ID `2`): 20 voters
  - Total Voters: 42
- **Sync Trigger**:
  - Web UI: Click **🤖 Sync Discord Poll** button on the Top Bar of `/admin` or `/history`.
  - API: `POST /api/discord/sync`

---

## 5. Deployment Commands

### Local Development
```bash
# Run locally using uv or python
uv run python server.py
# or
python server.py
```
App opens at `http://localhost:8000` (`/`, `/admin`, `/history`).

### Cloud Run Deployment
To deploy an updated build:
```bash
gcloud run deploy wow-faction-vote \
  --project=feiko-homepage \
  --region=europe-west4 \
  --source=. \
  --set-env-vars="GCS_BUCKET=wow-vote-data-207474260976,DISCORD_BOT_TOKEN=<YOUR_BOT_TOKEN>" \
  --allow-unauthenticated \
  --max-instances=1
```

---

## 6. Recommended Next Steps / Future Work

1. **Automated Scheduled Sync**:
   - Currently, Discord poll syncing is triggered on-demand via the UI button or `POST /api/discord/sync`.
   - If desired, a Cloud Scheduler job or a FastAPI background task could run `sync_discord_votes()` every 5-10 minutes.
2. **Discord Webhook Notifications**:
   - When a defection occurs (`Horde ➔ Alliance` or `Alliance ➔ Horde`), a notification can be posted to a council Discord channel via incoming webhook.
