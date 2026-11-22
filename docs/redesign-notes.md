# Portfolio Redesign Notes & Reconnaissance

## 1. File Structure & Component Separation
- **Public Site**:
  - `index.html`: Entry point for visitors. Contains semantic structure, navigation, section skeletons, and footer.
  - `assets/css/style.css`: Styles for the public site, typography, layouts, animations, and responsive rules.
  - `assets/js/main.js`: Vanilla ES6 script that fetches `data/portfolio.json`, injects content, orchestrates the hero terminal typing sequence, and handles navigation/theme interactions.
  - `assets/img/`: Static images, profile photo (`B_sphoto-1789478569220-5939.jpg`), project screenshots/svgs, favicon.
  - `assets/files/resume.pdf`: Downloadable resume.
  - `assets/fonts/`: Self-hosted variable woff2 fonts (`bricolage-grotesque-variable.woff2`, `jetbrains-mono-latin.woff2`).
- **Admin Panel**:
  - `admin/server.js`: Node.js Express server binding to `127.0.0.1:3000`. Serves admin UI, live preview, handles `/api/portfolio` GET/POST, `/api/upload` image uploads via multer, and `/api/backup`.
  - `admin/public/index.html`: Admin dashboard layout, sidebar navigation, form canvases, modals, toast alerts.
  - `admin/public/style.css`: Admin dashboard styles, dark sidebar, clean form controls.
  - `admin/public/app.js`: Admin frontend logic for managing data state, tab switching, live editing, image uploading, and disk persistence.

## 2. Content Storage & Data Model
Content is stored on disk at `data/portfolio.json` and served/updated through Express API endpoints.
### Content Types & Fields:
- **`profile`**:
  - `name` (string): Full name
  - `tagline` (string): Headline/subhead (supports light | bold phrase split)
  - `photo` (string): Relative path to portrait image
  - `location` (string): City, state, country
  - `bio` (string): Professional introduction summary
  - `resumeUrl` (string): Path or link to resume
  - `status` (string): Current availability statement
  - `socials` (array of objects): `{ platform, url, username }`
- **`education`** (array of objects):
  - `{ degree, institute, years, score, details }`
- **`skills`** (object grouped by category keys):
  - `languages` (array of strings)
  - `webDev` (array of strings)
  - `databases` (array of strings)
  - `toolsPlatforms` (array of strings)
  - `coreCS` (array of strings)
- **`projects`** (array of objects):
  - `{ title, description, tech (array), githubUrl, liveUrl, image, featured (boolean) }`
- **`experience`** (array of objects):
  - `{ role, org, duration, location, description (newline-separated bullet list) }`
- **`achievements`** (array of objects):
  - `{ title, date, link }`
- **`certifications`** (array of objects):
  - `{ title, issuer, date, link }`
- **`codingProfiles`** (array of objects):
  - `{ platform, handle, stats, url }`
- **`extracurricular`** (array of objects):
  - `{ title, duration, description }`
- **`news`** (array of objects):
  - `{ date, text }`

## 3. Data Flow (Public vs Admin)
- **Public Site Reading**:
  - When a visitor opens `index.html`, `assets/js/main.js` performs a `fetch('data/portfolio.json', { cache: 'no-cache' })`.
  - Content is dynamically rendered into semantic sections with HTML escaping.
- **Admin Saving & Publishing**:
  - Admin panel loads current data via `GET /api/portfolio`.
  - Edits in admin forms update an in-memory draft object.
  - When user clicks "Save changes" (or presses `Ctrl+S`), `POST /api/portfolio` writes the formatted JSON back to `data/portfolio.json`.
  - Image uploads POST to `/api/upload` (via `multer`) and save to `assets/img/` or `assets/img/projects/`.

## 4. Local Execution & Baseline Screenshots
- **How to run**:
  - Admin & preview: `node admin/server.js` (listening on `http://127.0.0.1:3000`).
  - Admin URL: `http://127.0.0.1:3000/admin`
  - Public site preview: `http://127.0.0.1:3000/preview/index.html` (or via static file server).
- **Baseline screenshots captured**:
  - `docs/before/site-1440.png`: Public site at desktop resolution (1440x900)
  - `docs/before/site-390.png`: Public site at mobile resolution (390x844)
  - `docs/before/admin-1440.png`: Admin panel at desktop resolution (1440x900)
  - `docs/before/admin-390.png`: Admin panel at mobile resolution (390x844)

## 5. Ten-Line Execution Plan
1. Commit Step 0 reconnaissance notes and baseline screenshots to `feat/portfolio-redesign-v2`.
2. Configure design tokens, CSS variables, dark theme tokens, and self-hosted `@font-face` definitions in `assets/css/style.css`.
3. Re-architect global layout, container widths, responsive grid, floating sticky header nav, and section header pattern in `index.html` and `assets/css/style.css`.
4. Build the terminal hero, portrait sun-circle with cutout fallback, dashed connector SVG, status chip, action buttons, and load sequence in `index.html`, `assets/css/style.css`, and `assets/js/main.js`.
5. Redesign About (large statement + facts code block), Skills (definition rows with tag pills), and Projects (featured full-width slab + 2-col card grid with per-project terminal covers) in `index.html`, `assets/css/style.css`, and `assets/js/main.js`.
6. Implement Experience & Education dashed timelines, Achievements & Certifications ledger tables, Coding Profiles tiles, Extracurricular entry, and News changelog ledger with expander in `index.html`, `assets/css/style.css`, and `assets/js/main.js`.
7. Build the terminal bookend footer, theme toggle (system/light/dark with localStorage persistence & no-flash script), and skip-to-content accessibility link.
8. Redesign Admin panel layout with 248px dark sidebar, brand header, unsaved changes status, keyboard shortcuts, and cohesive design tokens in `admin/public/index.html` and `admin/public/style.css`.
9. Upgrade Admin editing UX: list rows with drag/move reordering, slide-over drawer forms, image uploads with preview, multi-line bullet field, tags input, live preview pane with desktop/mobile switch, and delete modal with 8s undo toast in `admin/public/app.js`.
10. Apply content typo fixes in `data/portfolio.json`, run WCAG AA and responsive audits, capture `docs/after/` screenshots, update `README.md`, and prepare the PR.
