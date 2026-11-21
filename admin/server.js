const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // Strictly local binding

// Root workspace paths
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'portfolio.json');
const IMG_DIR = path.join(ROOT_DIR, 'assets', 'img');
const PROJECTS_IMG_DIR = path.join(IMG_DIR, 'projects');

// Ensure image directories exist
if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}
if (!fs.existsSync(PROJECTS_IMG_DIR)) {
  fs.mkdirSync(PROJECTS_IMG_DIR, { recursive: true });
}

// Multer storage for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isProject = req.query.type === 'project';
    const dest = isProject ? PROJECTS_IMG_DIR : IMG_DIR;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Clean filename: timestamp + sanitized original name
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg|gif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, SVG, WebP, GIF) are allowed.'));
    }
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve admin dashboard static files
app.use('/admin', express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Serve the live website for direct preview
app.use('/preview', express.static(ROOT_DIR));

// --------------------------------------------------------------------------
// API Routes
// --------------------------------------------------------------------------

/**
 * GET /api/portfolio
 * Reads current data/portfolio.json from disk
 */
app.get('/api/portfolio', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({ error: 'data/portfolio.json not found on disk.' });
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    res.json(data);
  } catch (err) {
    console.error('Error reading portfolio.json:', err);
    res.status(500).json({ error: `Failed to read portfolio data: ${err.message}` });
  }
});

/**
 * POST /api/portfolio
 * Validates and writes updated JSON to data/portfolio.json
 */
app.post('/api/portfolio', (req, res) => {
  try {
    const data = req.body;

    // Basic schema structure validation
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Payload must be a valid JSON object.' });
    }

    if (!data.profile || typeof data.profile !== 'object') {
      return res.status(400).json({ error: 'Payload is missing required "profile" object.' });
    }

    // Ensure directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write formatted JSON with 2-space indentation
    const jsonString = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(DATA_FILE, jsonString, 'utf-8');

    console.log(`[${new Date().toLocaleTimeString()}] Saved data/portfolio.json successfully.`);
    res.json({ success: true, message: 'Portfolio data saved to disk.' });
  } catch (err) {
    console.error('Error saving portfolio.json:', err);
    res.status(500).json({ error: `Failed to save portfolio data: ${err.message}` });
  }
});

/**
 * POST /api/upload
 * Handles image file uploads and returns the relative path
 */
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const isProject = req.query.type === 'project';
    const relativePath = isProject
      ? `assets/img/projects/${req.file.filename}`
      : `assets/img/${req.file.filename}`;

    console.log(`[Upload] Saved image to: ${relativePath}`);
    res.json({
      success: true,
      filePath: relativePath,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

/**
 * GET /api/backup
 * Downloads a timestamped copy of portfolio.json
 */
app.get('/api/backup', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.download(DATA_FILE, `portfolio-backup-${timestamp}.json`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate backup.' });
  }
});

// Start Express Server
const server = app.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`🚀 Portfolio Admin Panel is running!`);
  console.log(`👉 Open Admin:   http://${HOST}:${PORT}/admin`);
  console.log(`🔍 Live Preview: http://${HOST}:${PORT}/preview/index.html`);
  console.log('====================================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
