# MyTaste – Digital Recipe Book

Welcome to **MyTaste**, a lightweight web application for collecting, organizing and sharing your favourite recipes.  
The project consists of a React + TypeScript front-end and a minimal Express back-end that persists the data.

---

## Features
- Responsive recipe list with client-side search & filter
- Detail page for every recipe (ingredients, preparation steps, spices, optional image)
- Recipe creation form with live validation
- Persisted data via REST API (`/recipes`)
- Pleasant paper-grain UI theme

---

## Quick Start
### Installation

```bash
git clone <YOUR_FORK_URL> mytaste cd mytaste npm install # install all dependencies
```

### Environment Variables
Create a `.env` file in the project root and set the URL where the back-end will be available:

```bash 
REACT_APP_API_URL=[http://localhost:5000](http://localhost:5000) # default dev port
```

### Running the Application

```bash
# Starts Express on :5000 and React on :3000
npm run dev
```

The UI opens automatically at http://localhost:3000 and proxies API requests to the back-end.

---

## Available npm Scripts

| Script            | Description                                                             |
|-------------------|-------------------------------------------------------------------------|
| `npm run dev`     | Start front-end & back-end concurrently (development mode).             |
| `npm start`       | Start the CRA dev server only.                                          |
| `npm run server`  | Start the Express API only.                                             |
| `npm test`        | Run Jest in watch mode.                                                 |
| `npm run build`   | Create an optimised production build in `build/`.                       |
| `npm run lint`    | (optional) Run ESLint if configured.                                    |
| `npm run eject`   | Expose all CRA configuration files (irreversible).                      |

---

## Deployment
1. Build the front-end:
   ```bash
   npm run build
   ```
2. Serve `build/` with any static hosting provider (Netlify, Vercel, GitHub Pages, S3, …).
3. Deploy the Express server (Render, Fly.io, Railway, your own VPS, …).
4. Update `REACT_APP_API_URL` to the public API endpoint and rebuild if necessary.

A one-click Heroku / Docker setup can be added later.

---

## Contributing
PRs and issues are welcome!

1. Fork the repository and create a feature branch.
2. Follow the **Quick Start** guide above.
3. Adhere to the existing code style (Prettier/ESLint).
4. Write / update tests where appropriate.
5. Submit your pull request with a clear description.
