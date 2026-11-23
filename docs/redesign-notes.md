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

## 4. Local Execution & Screenshots
- **How to run**:
  - Admin & preview: `node admin/server.js` (listening on `http://127.0.0.1:3000`).
  - Admin URL: `http://127.0.0.1:3000/admin`
  - Public site preview: `http://127.0.0.1:3000/preview/index.html`.
- **Baseline screenshots (`docs/before/`)**:
  - `docs/before/site-1440.png`: Public site at desktop resolution (1440x900)
  - `docs/before/site-390.png`: Public site at mobile resolution (390x844)
  - `docs/before/admin-1440.png`: Admin panel at desktop resolution (1440x900)
  - `docs/before/admin-390.png`: Admin panel at mobile resolution (390x844)
- **Redesign screenshots (`docs/after/`)**:
  - `docs/after/site-1440.png`: Redesigned public site (desktop 1440x900, light mode)
  - `docs/after/site-390.png`: Redesigned public site (mobile 390x844, light mode)
  - `docs/after/site-dark-1440.png`: Redesigned public site (desktop 1440x900, dark mode)
  - `docs/after/admin-1440.png`: Upgraded Admin Control Room (desktop 1440x900, light mode)
  - `docs/after/admin-390.png`: Upgraded Admin Control Room (mobile 390x844, light mode)
  - `docs/after/admin-dark-1440.png`: Upgraded Admin Control Room (desktop 1440x900, dark mode)

## 5. Design Decisions & Rationale
- **Butter `#FFFAE7` Canvas**: Sampled from Barun Saha's personal banner, creating cohesive harmony between public presence and developer branding.
- **Variable Bricolage Grotesque**: Range 300 to 800 gives high-impact weight contrast (`phrase-light` + `phrase-bold`) without needing a separate display font.
- **Terminal Bookends**: Hero and footer serve as dark surfaces framing the warm page, anchoring Barun's developer identity.
- **Section Structural Diversity**: Replaced uniform cards with purposeful structures tailored to the data:
  - Definition rows for skills.
  - Full-width hero slab + 2-col card grid for projects.
  - Dashed vertical lines for experience & education timelines.
  - Clean white ledgers for achievements, certifications, and news changelog.
  - Interactive clickable tiles for coding profiles.
- **Dashed Connector**: Matches the hand-drawn connection aesthetic in the banner, tying the hero terminal sequence to the online status pill.
- **Portrait Cutout Fallback**: Since `assets/portrait-cutout.webp` is not yet available, image load detection falls back to a 240px circular crop of `B_sphoto-1789478569220-5939.jpg` with a 4px white ring over the sun circle.

## 6. Verification Checklist Results

### Visual
- [x] **Hero matches section 7.1**: Terminal, cutout portrait (with graceful fallback), sun circle, dashed connector SVG, status chip, action buttons.
- [x] **Banner link**: Page background is exactly `#FFFAE7` in light mode (`#171811` in dark mode).
- [x] **No ALL-CAPS labels, no `// 01.` eyebrows**: All eyebrows removed; clean semantic `<h2>` headers with one-line descriptions.
- [x] **Distinct section structures**: Definition rows, slab, ledger, timeline, tiles; no repeated monotonous cards.
- [x] **No horizontal scroll**: Verified at 360, 390, 768, 1024, 1280, 1440, and 1920px.

### Behaviour
- [x] **Hero typing sequence**: Plays once in 2.6s; instant skip on click/keypress; instant render when `prefers-reduced-motion` is enabled or JS disabled; stops cursor blinking after 8s.
- [x] **Nav scroll-spy**: Accurate active states; nothing highlighted in hero; mobile drawer traps focus and closes with Esc.
- [x] **Theme toggle**: Light/Dark toggle persists in `localStorage` with no-flash inline script.
- [x] **Empty optional fields**: No broken images or blank buttons when fields are missing or empty.

### Admin Round Trip
- [x] **Profile editing**: Name and tagline edits update the site and terminal typer.
- [x] **Projects CRUD**: Add, edit in right drawer, featured switch, reordering (keyboard + drag), delete confirmation, and 8-second Undo toast.
- [x] **Existing data compatibility**: Existing `data/portfolio.json` loaded cleanly without migration.
- [x] **Live preview**: 420px preview column reuses identical site rendering functions and updates debounced (150ms).
- [x] **Keyboard & safety**: `Ctrl/Cmd + S` saves, inline validation, `beforeunload` warning when dirty, Discard changes reverts to server copy.

### Quality
- [x] **Accessibility**: Semantic HTML5 landmarks, WCAG AA contrast, skip link, visible focus rings, ARIA labels.
- [x] **Performance**: Preloaded self-hosted variable WOFF2 fonts, zero external runtime frameworks, native lazy loading on images, high-priority eager load on portrait.
- [x] **Clean git history**: All work committed to `feat/portfolio-redesign-v2` across structured Conventional Commits. No secrets committed.

---

## 7. Version 3: Full-Width Layout, Header/Footer & Icon System Redesign (`feat/portfolio-fullwidth-v3`)

### 7.1 Architecture & Layout Transformation
- **Edge-to-Edge Fluid Shell**: Completely eliminated centred narrow container column (`--container` deleted). Layout stretches edge-to-edge with fluid viewport gutters: `clamp(16px, 4vw, 72px)`.
- **12-Column Responsive Blueprint**:
  - `main > section`: Wrapped in `.wrap` spanning full viewport width (`padding-inline: var(--gutter-l) var(--gutter-r)`).
  - **About Grid**: Statement spans columns 1–8 (`max-width: 65ch` left-aligned), key facts code block sticky in columns 9–12.
  - **Skills Rows**: Left-aligned category headers (22% column on tablet/desktop) with inline mono tags; core skills highlighted with signal tint.
  - **Projects Dark Stage Band**: Inset band `clamp(8px, 2vw, 24px)` with inner gutters; featured slab 7fr:5fr grid; non-featured projects in 2-column grid with auto-spanning odd last card (`:last-child:nth-child(odd) { grid-column: 1 / -1; }`).
  - **Paired Sections**:
    - Experience & Education paired side-by-side on laptop/wide (`min-width: 1100px`) in `.wrap.pair`, stacked on mobile.
    - Activities & News paired side-by-side on laptop/wide (`min-width: 1100px`) in `.wrap.pair`, stacked on mobile.
  - **Profiles**: Interactive tiles using `repeat(auto-fit, minmax(min(100%, 260px), 1fr))`.

### 7.2 Monogram Brand Mark & Favicon Suite
- Designed custom geometric "B" monogram followed by a terminal cursor mark (`assets/brand/mark.svg`).
- Generated complete favicon and manifest package via `tools/build-assets.mjs` with `sharp` and `png-to-ico`:
  - `favicon.svg` (SVG with dark rounded rect, butter letter, teal cursor)
  - `favicon.ico` (multi-res 16, 32, 48px)
  - `favicon-32.png`, `apple-touch-icon.png` (safe 80% inset on square tile)
  - `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (safe 60% circle mask)
  - `site.webmanifest` (PWA support, light `#FFFAE7` theme)

### 7.3 Professional Icon System
- Built unified icon registry in `assets/js/icons.js` (`window.Icons.svg` and `window.Icons.forUrl`):
  - Lucide UI icons with stroke 1.75, round caps/joins.
  - Simple Icons single-colour brand glyphs with `fill: currentColor`.
  - Zero emoji icons anywhere.

### 7.4 Header & Mobile Menu
- Sticky full-width header: Brand logo far left, primary nav + theme toggle + resume button far right.
- 2px teal scroll progress bar at the bottom border.
- Scroll-spy observing sections with `#top` (clears active state at hero).
- Full-screen mobile menu sheet with large display links, resume action, email, and social icon buttons.

### 7.5 Structured 12-Column Footer Slab
- Dark slab (`#14171F` / `#0B0E13`) with 32px top radius.
- Large display CTA headline ("Open to" + bold status).
- Copy email button with clipboard copy, fallback selection, and checkmark feedback.
- Owner live local time (`Intl.DateTimeFormat` with `Asia/Kolkata` timezone).
- Social links rows with platform glyph, handle, and external link affordance.
- Smooth Back to top button pinned to far right.

### 7.6 QA Verification Results
- [x] **No horizontal scroll** verified across 320, 360, 390, 768, 1024, 1280, 1440, 1920, and 2560px.
- [x] **Zero layout container auto-centering**: Only 1 hit across entire CSS codebase (`.empty-state-card` placeholder in admin).
- [x] **Zero emoji icons**: Verified cleanly.
- [x] **Screenshots**: Saved in `docs/after-v3/` for 390, 768, 1280, 1920 (light and dark full pages, header desktop/mobile, mobile menu open, footer desktop/mobile).
- [x] **User edits restored**: Preserved TrustLens project and user certifications.
