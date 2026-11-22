# Barun Saha — Portfolio & Control Room (v2)

Personal portfolio website and bespoke local administration dashboard ("Control Room") for Barun Saha, B.Tech CSE student, building scalable systems and application solutions.

Designed and engineered with an authentic, hand-crafted visual aesthetic: warm butter-cream canvas (`#FFFAE7`), variable typographic weight contrast, interactive terminal hero with a sun circle and portrait cutout, dashed SVG sequence connectors, semantic section layouts (definition rows, full-width featured slabs, dashed chronological timelines, and white ledgers), terminal bookend footer, and a dedicated 248px dark control room with live preview.

---

## 🎨 Visual Identity & Key Highlights

- **Palette**: Warm butter page background (`#FFFAE7` in light mode, `#171811` in dark mode) paired with developer teal signal accents (`#14B8A6` / `#2DD4BF`), warm honey badges (`#F59E0B`), and deep olive borders (`#565335`).
- **Typography**: Self-hosted variable `Bricolage Grotesque` (weights 300 to 800) offering dynamic weight-contrast pairings (`phrase-light` + `phrase-bold`) and `JetBrains Mono` for developer details, code blocks, and timestamps. Preloaded with zero flash-of-unstyled-text (FOUT).
- **Terminal Hero**: 12-column stage featuring a terminal with a 2.6s typing sequence (instant skip on click/keypress, instant render for `prefers-reduced-motion`), overlapping portrait cutout with sun circle, curved dashed connector, and an online status chip.
- **Distinct Section Structures**:
  - **About**: 7/5 column balance with large statement and a clean key-facts code block.
  - **Skills**: Definition rows (240px category column left, tag pills right).
  - **Projects**: Top full-width featured project slab (`--r-slab`) + 2-column card grid with dynamic per-project terminal covers.
  - **Experience & Education**: Dashed vertical timelines (`border-left: 2px dashed var(--signal)`), 14px nodes, score chips, and multi-line bullet lists.
  - **Achievements & Certifications**: White ledger cards with verification badges.
  - **Coding Profiles**: Interactive platform tiles with hover elevation.
  - **News**: Changelog ledger with fixed 180px date column and expander.
- **Terminal Footer**: Bookend dark terminal surface with primary contact pill and social channels.
- **Upgraded Admin Control Room**:
  - 248px dark sidebar (`#14171F`) with count badges, unsaved change indicators (`#F2A93B`), theme toggle, and public preview link.
  - Sticky top bar with save status pill, Discard changes, and Save changes (`Ctrl/Cmd + S`).
  - Right slide-over drawer for adding/editing entries with inline validation and character counters.
  - List reordering with keyboard Move Up/Down buttons and drag handles.
  - Delete confirmation modal with 8-second **Undo** toast.
  - 420px live preview pane with Desktop (100%) and Mobile (390px) viewport switch, updating dynamically as you type (150ms debounce).

---

## 🛠 Tech Stack

- **Public Site**: Vanilla HTML5, Vanilla CSS3 (CSS Variables, Flexbox, Grid), Vanilla ES6+ JavaScript. Zero external frameworks or heavy libraries.
- **Admin Panel**: Node.js, Express, Multer (local image upload), vanilla client-side dashboard application.
- **Data Storage**: `data/portfolio.json` file contract on disk.
- **Fonts**: Self-hosted `@font-face` WOFF2 (`Bricolage Grotesque` and `JetBrains Mono`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm

### Installation & Running Locally

1. Clone the repository and navigate to the root directory:
   ```bash
   git clone https://github.com/barun20saha/barun20saha.github.io.git
   cd barun20saha.github.io
   ```

2. Checkout the redesign branch:
   ```bash
   git checkout feat/portfolio-redesign-v2
   ```

3. Install admin dependencies (Express & Multer):
   ```bash
   cd admin
   npm install
   cd ..
   ```

4. Launch the local admin server and preview:
   ```bash
   node admin/server.js
   ```

5. Open your browser:
   - **Admin Control Room**: [http://127.0.0.1:3000/admin](http://127.0.0.1:3000/admin)
   - **Live Public Site Preview**: [http://127.0.0.1:3000/preview/index.html](http://127.0.0.1:3000/preview/index.html)
   - Alternatively, open `index.html` directly or serve via any static file server.

---

## 📁 Repository Structure

```
├── assets/
│   ├── css/
│   │   └── style.css            # Public site stylesheets & design tokens
│   ├── fonts/
│   │   ├── bricolage-grotesque-variable.woff2
│   │   └── jetbrains-mono-latin.woff2
│   ├── img/                     # Images, profile photo, and project media
│   └── js/
│       └── main.js              # Public site dynamic renderer & hero sequence
├── admin/
│   ├── package.json             # Express & Multer dependencies
│   ├── server.js                # Local API server (GET/POST /api/portfolio, upload)
│   └── public/
│       ├── index.html           # Admin control room layout & sidebar
│       ├── style.css            # Admin theme & drawer styles
│       └── app.js               # Admin frontend, CRUD, drawer, live preview, undo
├── data/
│   └── portfolio.json           # Canonical JSON portfolio data store
├── docs/
│   ├── before/                  # Baseline screenshots (desktop & mobile)
│   ├── after/                   # Redesign screenshots (desktop, mobile, dark)
│   └── redesign-notes.md        # Architecture, design decisions, verification
├── index.html                   # Public portfolio website entry point
└── README.md
```

---

## ⚙️ Administration & Editing

The Admin Control Room is strictly bound to `127.0.0.1:3000` and is not exposed in public site navigation:

1. **Editing Data**: Navigate through the sidebar sections. Edits are tracked in-memory, showing an unsaved dot next to modified sections.
2. **Slide-over Drawer**: Click on the pencil icon or "Add" button to edit/create items. Inline validation prevents empty required fields or malformed links.
3. **Live Preview**: See immediate feedback in the 420px preview column as you type, with toggles for desktop and mobile viewports.
4. **Deleting with Undo**: Deleting an item triggers a confirmation modal followed by an 8-second toast notification with a one-click "Undo" button.
5. **Publishing to Disk**: Click "Save changes" or press `Ctrl+S` (`Cmd+S`) to write changes directly to `data/portfolio.json`.
