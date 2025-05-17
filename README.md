# MyTaste 🍽️

**MyTaste** is a full‑stack personal recipe book and shopping‑list generator.  It lets you store recipes, import them directly from [chefkoch.de](https://www.chefkoch.de), and export ingredients into the Bring! grocery‑list app – all wrapped in a responsive PWA you can install on your phone.

---

## ✨ Features

| Area         | Highlights                                                                                                                            |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------|
| **Recipes**  | • List, view, add, edit & delete<br>• Rich recipe viewer with quantities, and notes<br>• Image support                                |
| **Importer** | • One‑click import from other sites                                                                                                   |
| **Bring!**   | • Generates a deep‑link so the current recipe lands in your Bring! shopping list – including amounts, units & optional *stock* spices |
| **Auth**     | • Simple JWT‑based login for admin‑only actions                                                                                       |
| **PWA**      | • Offline cache via Workbox service‑worker<br>• "Add to Home Screen" ready                                                            |
| **Docker**   | • Two tiny Alpine‑based images (backend & frontend)                                                                                   |

---

## 🛠 Tech stack

* **Frontend**  – React 19 + TypeScript + React Router 7, CSS Modules.
* **Backend**   – Node 20, Express 5, JSON file storage.
* **Scraping**  – axios, cheerio (JSON‑LD extraction).
* **Auth**      – JSON Web Tokens (JWT).
* **PWA**       – Workbox + service‑worker.
* **Container** – Docker (Alpine) + Nginx for static serving.

---

## 🐳 Run with Docker Compose

Pre‑built images are published to **GitHub Container Registry**:

* `ghcr.io/melanx/mytaste-backend:latest`
* `ghcr.io/melanx/mytaste-frontend:latest`

The **`examples/`** directory ships with three ready‑to‑use Compose files:

| File                                   | What it spins up                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `examples/docker-compose.yml`          | **Frontend + Backend** – everything you need for a local stack on [http://localhost:3000](http://localhost:3000). |
| `examples/docker-compose-backend.yml`  | **Backend only** – perfect when you host the UI elsewhere or want head‑less API access.                           |
| `examples/docker-compose-frontend.yml` | **Frontend only** – point `REACT_APP_API_URL` at an existing API and serve the PWA.                               |

### ▶️ Quick start (full stack)

```bash
cd examples
# brings up both services in the background
docker compose up -d
```

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend  : [http://localhost:5000](http://localhost:5000)

> **Login:** `admin` / `adm1n`

### 🔑 Environment variables

| Service  | Variable                    | Purpose                             |
| -------- | --------------------------- | ----------------------------------- |
| backend  | `ADMIN_USER` / `ADMIN_PASS` | Username & password for admin login |
| backend  | `JWT_SECRET`                | Secret used to sign JWT tokens      |
| frontend | `REACT_APP_API_URL`         | Public URL of the backend API       |

The full‑stack compose defines **all** variables on the *frontend* service; its entry‑point script copies them into the generated `config.json` **and** passes the auth ones down to the backend via Docker’s internal network.

---

### 🏗️ Manual image build (optional)

If you prefer to build images yourself instead of pulling from GHCR:

```bash
# build
docker build -t mytaste-backend  ./backend
docker build -t mytaste-frontend ./frontend

# run (same ports & env vars as above)
```

All images are based on Alpine & kept lean (\~60 MB combined).

---

## 🔑 Environment variables

| Component | Variable            | Description                    |
|-----------|---------------------|--------------------------------|
| Backend   | `ADMIN_USER`        | Username for login             |
|           | `ADMIN_PASS`        | Password for login             |
|           | `JWT_SECRET`        | Secret used to sign JWT tokens |
| Frontend  | `REACT_APP_API_URL` | Base URL of the backend API    |

---

## 📡 API overview

| Method | Endpoint                | Description             |
|--------|-------------------------|-------------------------|
| GET    | `/api/recipes`          | All recipes (array)     |
| POST   | `/api/recipes` 🔒       | Create recipe           |
| GET    | `/api/recipe/:id`       | Single recipe           |
| PUT    | `/api/recipe/:id` 🔒    | Update recipe           |
| GET    | `/api/bring-recipe/:id` | Bring!‑formatted JSON   |
| POST   | `/api/import` 🔒        | Import from chefkoch.de |
| POST   | `/api/login`            | Obtain JWT              |

*🔒 = requires `Authorization: Bearer <token>`*

---

## 🧪 Testing

```bash
# React component tests (Jest + React Testing Library)
(cd frontend && npm test)
```

(Backend currently has no automated tests – PRs welcome!)

---

## 🛠 Building front‑end bundle manually

```bash
(cd frontend && npm run build)   # outputs to frontend/build
```

The backend is pure Node and needs no build step.

---

## 🌐 Deployment tips

* Serve the **frontend** behind HTTPS (for PWA install prompt).
* Map `/api` to the backend container (or a sub‑domain) and set `REACT_APP_API_URL` accordingly before building the frontend.
* Use an external volume for `backend/data` so your recipes survive container restarts.

---

## 🙌 Contributing

1. Fork & clone the repo.
2. Switch to a feature branch.
3. Run `npm run lint` (if you add ESLint) and `npm test`.
4. Open a PR – thanks!

---

## 📝 License

This project is released under the MIT License – see [LICENSE](LICENSE) for details.
