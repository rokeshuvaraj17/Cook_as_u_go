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

## Deploy (Backend on Render)

`render.yaml` describes a Node web service rooted at **`Backend/`** (`npm ci`, `npm start`, health check **`/api/health`**).

1. In [Render](https://render.com): **New → Blueprint** (apply `render.yaml`) **or** **New Web Service** → connect **`rokeshuvaraj17/Cook_as_u_go`**.
2. Set **Root Directory** to **`Backend`**, **Build** `npm ci`, **Start** `npm start`, **Health Check Path** `/api/health`.
3. Under **Settings → Build & Deploy**, enable **Auto-Deploy** for branch **`main`** so every GitHub push redeploys.
4. Add environment variables in Render (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, password salts, `SCAN_API_URL`, etc.) — see `Backend/.env.example`.

GitHub Actions (`.github/workflows/ci-and-deploy.yml`) runs **`npm ci`** for `Backend/` and `Mobile_ui/` on pushes and PRs. After each push to **`main`**, if you add repository secret **`RENDER_DEPLOY_HOOK_URL`** (from Render → **Deploy Hook**), the workflow triggers an extra deploy; if you use Render’s built-in **Auto-Deploy**, you can leave that secret unset.

---

*Earlier coursework README (cs5704) referenced ScanAndSave + React; this repo extends that with the mobile app and kitchen API.*
