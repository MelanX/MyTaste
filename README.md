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
cd ../frontend && npm test   # React Testing Library
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

## 🌐 Reverse proxy (Nginx Proxy Manager)

If you expose MyTaste through **Nginx Proxy Manager** and host both the frontend and backend behind the same domain, NPM
must be told to forward `/api/` requests to the backend container — otherwise nginx serves the frontend for all paths 
and API calls fail.

> [!NOTE]
> **Required step when using a single domain for both frontend and backend.**
> Without this, the app will not be able to authenticate or fetch recipes, showing
> a 405 error on login and a blank / loading screen that never resolves.

### Setup in NPM (one domain, path-based routing)

1. In NPM → **Proxy Hosts**, edit the entry for your domain.
2. The main **Forward Hostname / Port** should point to the **frontend** container (port `3000`).
3. Open the **Custom Locations** tab → click **Add location**.
4. Fill in:
   - **Location:** `/api/`
   - **Scheme:** `http`
   - **Forward Hostname / IP:** your backend container name (e.g. `mytaste-backend`)
   - **Forward Port:** `5000`
5. Click the **gear icon** in that location row and paste:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```
6. Save and test.

> [!TIP]
> If you prefer two separate proxy hosts (e.g. `mytaste.example.com` for the frontend
> and `api.mytaste.example.com` for the backend), no custom location is needed — just
> set `API_URL` in your `config.json` to the backend domain and skip the steps above.

---

## 🔄 Updating

```bash
# if you use the published images
docker compose pull
docker compose up -d
```

Images live at **ghcr.io/melanx/mytaste-backend** and **ghcr.io/melanx/mytaste-frontend**.
