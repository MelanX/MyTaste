# MyTaste – Digital Recipe Book 🍲

MyTaste is a lightweight, self-hosted recipe manager consisting of:

| Layer          | Tech                    | Highlights                                                     |
|----------------|-------------------------|----------------------------------------------------------------|
| **Backend**    | Node.js 22 ✚ Express 5  | REST API, JWT auth, SQLite/JSON storage, unit-tested with Jest |
| **Frontend**   | React 19 ✚ TypeScript   | PWA (offline-capable), responsive UI, service-worker caching   |
| **Containers** | Docker / Docker Compose | Official images on GitHub Container Registry                   |

---

## 🚀 Quick start

### 1. Run with Docker Compose (recommended)

```bash
# download an example compose file
curl -O https://raw.githubusercontent.com/MelanX/MyTaste/examples/docker-compose.yml

# spin everything up
docker compose up -d
```

The compose file starts **frontend:3000** and **backend:5000**.  
Edit the environment variables (see below) before the first run.

### 2. Local development without Docker

```bash
git clone https://github.com/MelanX/MyTaste.git
cd MyTaste

# ── backend ───────────────────────────
cd backend
npm install
node server.js              # http://localhost:5000

# ── frontend (new shell) ──────────────
cd ../frontend
npm install
npm start                   # http://localhost:3000
```

Lazy way: `cd frontend && npm run start` – this script spins up backend **and** frontend concurrently.

---

## 🔐 Required environment variables

| Variable                    | Scope    | Example                       | Description                                |
|-----------------------------|----------|-------------------------------|--------------------------------------------|
| `ADMIN_USER` / `ADMIN_PASS` | backend  | `admin` / `adm1n`             | Single admin login                         |
| `JWT_SECRET`                | backend  | _very long random string_     | Signs access-tokens (mandatory)            |
| `JWT_REFRESH_SECRET`        | backend  | _very long random string_     | (Optional) separate key for refresh-tokens |
| `REQUIRE_LOGIN`             | backend  | `true` / `false`              | Hides nearly all routes                    |
| `ALLOWED_ORIGINS`           | backend  | `https://mytaste.example.com` | Comma-separated CORS whitelist             |
| `REACT_APP_API_URL`         | frontend | `https://api.example.com`     | Public backend URL shown to the SPA        |

---

## 🧪 Running tests

```bash
cd backend   && npm test     # Jest unit tests
cd ../frontend && npm test   # React Testing Library, not implemented yet
```

---

## 📦 Build your own images

```bash
# backend
cd backend
docker build -t mytaste-backend .

# frontend
cd ../frontend
docker build -t mytaste-frontend .
```

Use the locally built tags in your compose file.

---

## 🔄 Updating

```bash
# if you use the published images
docker compose pull
docker compose up -d
```

Images live at **ghcr.io/melanx/mytaste-backend** and **ghcr.io/melanx/mytaste-frontend**.
