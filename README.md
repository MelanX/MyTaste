# MyTaste – Digital Recipe Book 🍲

MyTaste is a lightweight, self-hosted recipe manager consisting of:

| Layer          | Tech                                    | Highlights                                                          |
| -------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| **App**        | Node.js 24 ✚ Express 5 (TS/ESM) ✚ React 19 ✚ Vite ✚ Tailwind v4 | Single container: REST API + PWA frontend, JWT auth, JSON-file storage, unit-tested with Vitest |
| **Containers** | Docker / Docker Compose                  | Official image on GitHub Container Registry                          |

---

## 🚀 Quick start

### 1. Run with Docker Compose (recommended)

```bash
# download an example compose file
curl -O https://raw.githubusercontent.com/MelanX/MyTaste/examples/docker-compose.yml

# spin everything up
docker compose up -d
```

The compose file starts a single **mytaste:3000** container (backend + frontend served together on one port).
Edit the environment variables (see below) before the first run.

### 2. Local development without Docker

Requires **Node.js 24+**. The repo uses npm workspaces-style root scripts.

```bash
git clone https://github.com/MelanX/MyTaste.git
cd MyTaste

npm run install:all   # install backend + frontend deps
npm run dev           # backend (http://localhost:5000) and frontend (http://localhost:5173)
```

Run them separately if you prefer:

```bash
npm run dev:backend   # Express via tsx  → http://localhost:5000
npm run dev:frontend  # Vite dev server  → http://localhost:5173 (proxies /api → :5000)
```

---

## 🔐 Required environment variables

The frontend and backend are served from the same container on the same origin, so no public API URL needs to
be configured — API calls are made to relative `/api` paths.

| Variable                    | Example                       | Description                          |
| --------------------------- | ------------------------------ | ------------------------------------- |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / `adm1n`              | Single admin login                    |
| `JWT_SECRET`                | _very long random string_      | Signs access-tokens (mandatory)       |
| `JWT_REFRESH_SECRET`        | _very long random string_      | (Optional) separate key for refresh-tokens |
| `REQUIRE_LOGIN`             | `true` / `false`               | Hides nearly all routes               |
| `ALLOWED_ORIGINS`           | `https://mytaste.example.com`  | Comma-separated CORS whitelist (only relevant if you call the API from a different origin) |

---

## 🧪 Running tests

```bash
npm run test:all             # backend (Vitest) + frontend (Vitest + Testing Library)
```

Per package: `npm test --prefix backend` / `npm test --prefix frontend`.
Lint & formatting: `npm run lint --prefix frontend` · `npm run format:check`.

---

## 📦 Build your own image

```bash
docker build -t mytaste .
```

Run from the repository root so the build can see both `frontend/` and `backend/`.
Use the locally built tag in your compose file.

---

## 🌐 Reverse proxy (Nginx Proxy Manager)

Since the frontend and API are served from the same container on the same port, no path-based routing is
needed. In NPM → **Proxy Hosts**, point the **Forward Hostname / Port** at the `mytaste` container's port
(`5000`, or whatever host port you mapped it to) and save — that's it.

---

## 🔄 Updating

```bash
# if you use the published images
docker compose pull
docker compose up -d
```

The image lives at **ghcr.io/melanx/mytaste**.
