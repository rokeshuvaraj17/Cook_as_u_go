# Cook_as_u_go

Kitchen and pantry companion: **Expo (React Native)** mobile UI, **Node/Express** kitchen API, **FastAPI** receipt scanning (ScanAndSave), and **React** web frontend.

## Layout

| Path | Role |
|------|------|
| `Mobile_ui/` | Expo app (login, pantry, bills, receipt scan via API proxy) |
| `Backend/` | REST API (auth, kitchen items, bills; proxies receipt preview to ScanAndSave) |
| `ScanAndSave/` | FastAPI + receipt pipeline |
| `frontend/` | Web UI |

## Quick start (dev)

1. **Backend** — copy `Backend/.env.example` to `Backend/.env`, install deps, run `npm run dev` in `Backend/` (default port `5051`).
2. **ScanAndSave** — Python venv, `pip install -r requirements.txt`, run FastAPI on port `8000`; set `SCAN_API_URL` in Backend `.env` if needed.
3. **Mobile_ui** — `npm install`, `npm start` (see `Mobile_ui/package.json` for Android reverse / LAN notes).

---

*Earlier coursework README (cs5704) referenced ScanAndSave + React; this repo extends that with the mobile app and kitchen API.*
