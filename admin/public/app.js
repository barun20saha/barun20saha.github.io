/**
 * Admin Panel Client Application
 * Full CRUD, reordering, direct image uploads, raw JSON editing, and disk sync
 */

let portfolioData = null;
let currentTab = 'profile';
let isDirty = false;

// Modal state
let currentModalContext = null; // { section, index, isNew }

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupNavigation();
  setupGlobalActions();
  await loadPortfolioData();
}

/**
 * Fetch portfolio.json from server
 */
async function loadPortfolioData() {
  try {
    const res = await fetch('/api/portfolio');
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    portfolioData = await res.json();
    setDirty(false);
    renderCurrentTab();
    showToast('Loaded portfolio data from disk', 'info');
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    showToast(`Error loading data: ${err.message}`, 'error');
  }
}

/**
 * Save current portfolioData back to disk
 */
async function saveToDisk() {
  if (!portfolioData) return;

  // If in raw JSON tab, parse textarea first
  if (currentTab === 'rawJson') {
    const rawEl = document.getElementById('raw-json-textarea');
    if (rawEl) {
      try {
        portfolioData = JSON.parse(rawEl.value);
      } catch (err) {
        showToast(`Invalid JSON syntax: ${err.message}`, 'error');
        return;
      }
    }
  }

  try {
    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioData)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save');

    setDirty(false);
    showToast('Saved changes to data/portfolio.json!', 'success');
  } catch (err) {
    console.error('Save error:', err);
    showToast(`Failed to save: ${err.message}`, 'error');
  }
}

function setDirty(state) {
  isDirty = state;
  const badge = document.getElementById('unsaved-badge');
  if (badge) badge.style.display = isDirty ? 'inline-block' : 'none';
}

/**
 * Navigation and Sidebar Handlers
 */
function setupNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderCurrentTab();
    });
  });
}

/**
 * Global Header Actions (Save, Export, Import, Keyboard Shortcuts)
 */
function setupGlobalActions() {
  // Save button
  document.getElementById('btn-save-disk').addEventListener('click', saveToDisk);

  // Backup Export
  document.getElementById('btn-export-backup').addEventListener('click', () => {
    window.location.href = '/api/backup';
  });

  // JSON Import
  const importInput = document.getElementById('import-json-input');
  importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.profile) {
          throw new Error('Imported JSON is missing a required "profile" section.');
        }
        portfolioData = parsed;
        setDirty(true);
        renderCurrentTab();
        showToast('JSON imported into editor! Click "Save to Disk" to apply.', 'success');
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // Keyboard shortcut: Ctrl+S or Cmd+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveToDisk();
    }
  });

  // Modal Close buttons
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-form').addEventListener('submit', handleModalSubmit);
}

/**
 * Main Tab Router
 */
function renderCurrentTab() {
  const container = document.getElementById('tab-content-container');
  if (!portfolioData) {
    container.innerHTML = '<div class="section-panel"><p>Loading portfolio data...</p></div>';
    return;
  }

  switch (currentTab) {
    case 'profile':
      renderProfileTab(container);
      break;
    case 'education':
      renderListSectionTab(container, 'education', 'Education History', [
        { key: 'degree', label: 'Degree / Title', type: 'text', required: true },
        { key: 'institute', label: 'Institution / School', type: 'text', required: true },
        { key: 'years', label: 'Timeline (e.g. 2023 – 2027)', type: 'text', required: true },
        { key: 'score', label: 'Score / CGPA', type: 'text' },
        { key: 'details', label: 'Coursework & Details', type: 'textarea' }
      ]);
      break;
    case 'skills':
      renderSkillsTab(container);
      break;
    case 'projects':
      renderProjectsTab(container);
      break;
    case 'experience':
      renderListSectionTab(container, 'experience', 'Experience & Roles', [
        { key: 'role', label: 'Role / Position', type: 'text', required: true },
        { key: 'org', label: 'Organization / Company', type: 'text', required: true },
        { key: 'duration', label: 'Duration (e.g. Jun 2026 – Aug 2026)', type: 'text', required: true },
        { key: 'location', label: 'Location / Work Mode', type: 'text' },
        { key: 'description', label: 'Responsibilities & Impact', type: 'textarea', required: true }
      ]);
      break;
    case 'achievements':
      renderListSectionTab(container, 'achievements', 'Achievements & Contests', [
        { key: 'title', label: 'Milestone / Award Title', type: 'text', required: true },
        { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
        { key: 'link', label: 'Verification Link URL', type: 'text' }
      ]);
      break;
    case 'certifications':
      renderListSectionTab(container, 'certifications', 'Certifications & Training', [
        { key: 'title', label: 'Certification Title', type: 'text', required: true },
        { key: 'issuer', label: 'Issuing Organization', type: 'text', required: true },
        { key: 'date', label: 'Issue Date (YYYY-MM)', type: 'text' },
        { key: 'link', label: 'Credential Verification URL', type: 'text' }
      ]);
      break;
    case 'codingProfiles':
      renderListSectionTab(container, 'codingProfiles', 'Coding Platforms', [
        { key: 'platform', label: 'Platform Name (LeetCode, Codeforces, etc.)', type: 'text', required: true },
        { key: 'handle', label: 'Username / Handle', type: 'text', required: true },
        { key: 'stats', label: 'Stats Highlight (e.g. 500+ Solved • Rating 1940+)', type: 'text', required: true },
        { key: 'url', label: 'Profile URL', type: 'text', required: true }
      ]);
      break;
    case 'extracurricular':
      renderListSectionTab(container, 'extracurricular', 'Extracurricular & Leadership', [
        { key: 'title', label: 'Activity / Leadership Title', type: 'text', required: true },
        { key: 'duration', label: 'Duration (e.g. 2025 – Present)', type: 'text' },
        { key: 'description', label: 'Role Description', type: 'textarea', required: true }
      ]);
      break;
    case 'news':
      renderListSectionTab(container, 'news', 'News & Milestone Timeline', [
        { key: 'date', label: 'Date (YYYY-MM-DD or YYYY-MM)', type: 'text', required: true },
        { key: 'text', label: 'Milestone / Update Text', type: 'textarea', required: true }
      ]);
      break;
    case 'rawJson':
      renderRawJsonTab(container);
      break;
  }
}

/* --------------------------------------------------------------------------
   1. Profile Section Tab
   -------------------------------------------------------------------------- */
function renderProfileTab(container) {
  const p = portfolioData.profile || {};

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Profile &amp; Header Settings</h2>
          <p>Personal information, hero introduction, and contact channels.</p>
        </div>
      </div>

      <form id="profile-form">
        <div class="form-group inline">
          <div>
            <label class="form-label">Full Name</label>
            <input type="text" id="prof-name" class="form-control" value="${escapeAttr(p.name || '')}" required>
          </div>
          <div>
            <label class="form-label">Tagline</label>
            <input type="text" id="prof-tagline" class="form-control" value="${escapeAttr(p.tagline || '')}" required>
          </div>
        </div>

        <div class="form-group inline">
          <div>
            <label class="form-label">Location</label>
            <input type="text" id="prof-location" class="form-control" value="${escapeAttr(p.location || '')}">
          </div>
          <div>
            <label class="form-label">Availability / Status Pill</label>
            <input type="text" id="prof-status" class="form-control" value="${escapeAttr(p.status || '')}" placeholder="e.g. Open to Internships">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Profile Photo</label>
          <div class="image-picker-group">
            <img src="/preview/${p.photo || 'assets/img/profile.svg'}" class="image-preview-thumb" id="prof-photo-preview" alt="Preview">
            <input type="text" id="prof-photo" class="form-control" value="${escapeAttr(p.photo || '')}" style="flex: 1;">
            <label class="btn btn-secondary btn-file-label">
              Upload Image
              <input type="file" id="prof-photo-file" accept="image/*" style="display: none;">
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Resume PDF File Path or URL</label>
          <input type="text" id="prof-resume" class="form-control" value="${escapeAttr(p.resumeUrl || '')}">
        </div>

        <div class="form-group">
          <label class="form-label">About Bio</label>
          <textarea id="prof-bio" class="form-control" rows="4">${escapeHTML(p.bio || '')}</textarea>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label class="form-label" style="margin-bottom: 0;">Social &amp; Contact Links</label>
            <button type="button" id="btn-add-social" class="btn btn-secondary btn-sm">+ Add Social Link</button>
          </div>
          <div id="socials-list-container" class="item-list-container">
            <!-- Rendered below -->
          </div>
        </div>
      </form>
    </div>
  `;

  // Render Socials
  renderSocialsList();

  // Wire input change listeners to sync directly to portfolioData
  ['prof-name', 'prof-tagline', 'prof-location', 'prof-status', 'prof-photo', 'prof-resume', 'prof-bio'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      p.name = document.getElementById('prof-name').value;
      p.tagline = document.getElementById('prof-tagline').value;
      p.location = document.getElementById('prof-location').value;
      p.status = document.getElementById('prof-status').value;
      p.photo = document.getElementById('prof-photo').value;
      p.resumeUrl = document.getElementById('prof-resume').value;
      p.bio = document.getElementById('prof-bio').value;
      setDirty(true);
    });
  });

  // Image upload handler
  const fileInput = document.getElementById('prof-photo-file');
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files[0]) return;
    const uploadedPath = await uploadImageFile(fileInput.files[0], 'avatar');
    if (uploadedPath) {
      document.getElementById('prof-photo').value = uploadedPath;
      document.getElementById('prof-photo-preview').src = `/preview/${uploadedPath}`;
      p.photo = uploadedPath;
      setDirty(true);
      showToast('Avatar uploaded successfully!', 'success');
    }
  });

  document.getElementById('btn-add-social').addEventListener('click', () => {
    if (!Array.isArray(p.socials)) p.socials = [];
    p.socials.push({ platform: 'GitHub', url: 'https://github.com/', username: '' });
    setDirty(true);
    renderSocialsList();
  });
}

function renderSocialsList() {
  const container = document.getElementById('socials-list-container');
  if (!container) return;
  const p = portfolioData.profile;
  if (!Array.isArray(p.socials)) p.socials = [];

  container.innerHTML = p.socials.map((s, idx) => `
    <div class="list-entry-card">
      <div style="display: flex; gap: 10px; flex: 1;">
        <input type="text" class="form-control" style="width: 140px;" value="${escapeAttr(s.platform)}" placeholder="Platform" onchange="updateSocialField(${idx}, 'platform', this.value)">
        <input type="text" class="form-control" style="flex: 1;" value="${escapeAttr(s.url)}" placeholder="URL" onchange="updateSocialField(${idx}, 'url', this.value)">
      </div>
      <div class="entry-actions">
        <button type="button" class="icon-action-btn delete" onclick="deleteSocial(${idx})" title="Delete">&times;</button>
      </div>
    </div>
  `).join('');
}

window.updateSocialField = (idx, field, value) => {
  portfolioData.profile.socials[idx][field] = value;
  setDirty(true);
};

window.deleteSocial = (idx) => {
  portfolioData.profile.socials.splice(idx, 1);
  setDirty(true);
  renderSocialsList();
};

/* --------------------------------------------------------------------------
   2. Skills Section Tab
   -------------------------------------------------------------------------- */
function renderSkillsTab(container) {
  if (!portfolioData.skills || typeof portfolioData.skills !== 'object') {
    portfolioData.skills = {};
  }
  const skills = portfolioData.skills;

  const categoryLabels = {
    languages: 'Programming Languages',
    webDev: 'Web & Frameworks',
    databases: 'Databases & Storage',
    toolsPlatforms: 'Tools & Platforms',
    coreCS: 'Core Computer Science'
  };

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Skills &amp; Technologies</h2>
          <p>Grouped tag clusters displayed on the website. Type a skill and press <strong>Enter</strong> to add.</p>
        </div>
      </div>

      <div id="skills-categories-list">
        ${Object.keys(skills).map(catKey => `
          <div class="form-group" style="background: #F8FAFC; padding: 16px; border-radius: 6px; border: 1px solid var(--admin-border); margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="margin-bottom: 0;">${escapeHTML(categoryLabels[catKey] || catKey)} (<code>${escapeHTML(catKey)}</code>)</label>
            </div>
            <div class="tags-input-wrapper" id="tag-box-${catKey}">
              ${(skills[catKey] || []).map((skill, sIdx) => `
                <span class="tag-badge">
                  ${escapeHTML(skill)}
                  <button type="button" class="tag-remove-btn" onclick="removeSkillTag('${catKey}', ${sIdx})">&times;</button>
                </span>
              `).join('')}
              <input type="text" class="tag-text-input" placeholder="+ Add skill (press Enter)" onkeydown="handleSkillTagKeydown(event, '${catKey}')">
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--admin-border);">
        <h4 style="font-size: 0.875rem; margin-bottom: 8px;">Add Custom Skill Category</h4>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="new-category-key" class="form-control" placeholder="Category key (e.g. devOps, mobileDev)" style="max-width: 300px;">
          <button type="button" id="btn-add-category" class="btn btn-secondary btn-sm">+ Add Category</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-category').addEventListener('click', () => {
    const input = document.getElementById('new-category-key');
    const key = input.value.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (!key) {
      showToast('Please enter a valid alphanumeric category key', 'error');
      return;
    }
    if (portfolioData.skills[key]) {
      showToast('Category already exists', 'error');
      return;
    }
    portfolioData.skills[key] = [];
    setDirty(true);
    renderSkillsTab(container);
  });
}

window.removeSkillTag = (catKey, sIdx) => {
  portfolioData.skills[catKey].splice(sIdx, 1);
  setDirty(true);
  renderCurrentTab();
};

window.handleSkillTagKeydown = (e, catKey) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().replace(/,$/, '');
    if (val) {
      if (!Array.isArray(portfolioData.skills[catKey])) {
        portfolioData.skills[catKey] = [];
      }
      portfolioData.skills[catKey].push(val);
      e.target.value = '';
      setDirty(true);
      renderCurrentTab();
    }
  }
};

/* --------------------------------------------------------------------------
   3. Projects Tab
   -------------------------------------------------------------------------- */
function renderProjectsTab(container) {
  if (!Array.isArray(portfolioData.projects)) portfolioData.projects = [];
  const projects = portfolioData.projects;

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Projects Management</h2>
          <p>Add, edit, reorder, or upload screenshots for featured engineering projects.</p>
        </div>
        <button id="btn-add-project" class="btn btn-primary btn-sm">+ New Project</button>
      </div>

      <div class="item-list-container">
        ${projects.length === 0 ? '<p style="color: var(--admin-muted);">No projects added yet.</p>' : ''}
        ${projects.map((proj, idx) => `
          <div class="list-entry-card">
            <div style="display: flex; align-items: center; gap: 14px; flex: 1; overflow: hidden;">
              <img src="/preview/${proj.image || 'assets/img/projects/hyperlog.svg'}" style="width: 50px; height: 32px; object-fit: cover; border-radius: 4px; background: #14171F;" alt="">
              <div class="entry-info">
                <div class="entry-main-title">
                  ${proj.featured ? '<span class="entry-badge" style="color: #B45309; background: #FEF3C7;">Featured</span>' : ''}
                  ${escapeHTML(proj.title)}
                </div>
                <div class="entry-subtitle">${escapeHTML(Array.isArray(proj.tech) ? proj.tech.join(', ') : '')}</div>
              </div>
            </div>
            <div class="entry-actions">
              <button type="button" class="icon-action-btn" onclick="moveItem('projects', ${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
              <button type="button" class="icon-action-btn" onclick="moveItem('projects', ${idx}, 1)" ${idx === projects.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
              <button type="button" class="icon-action-btn" onclick="editProject(${idx})" title="Edit">✏️</button>
              <button type="button" class="icon-action-btn delete" onclick="deleteItem('projects', ${idx})" title="Delete">&times;</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-add-project').addEventListener('click', () => {
    openProjectModal(null);
  });
}

window.editProject = (idx) => {
  openProjectModal(idx);
};

function openProjectModal(index) {
  const isNew = index === null;
  const project = isNew ? {
    title: '',
    description: '',
    tech: [],
    githubUrl: '',
    liveUrl: '',
    image: 'assets/img/projects/hyperlog.svg',
    featured: false
  } : JSON.parse(JSON.stringify(portfolioData.projects[index]));

  currentModalContext = { section: 'projects', index, isNew, data: project };

  document.getElementById('modal-title').textContent = isNew ? 'Add New Project' : 'Edit Project';
  const fieldsContainer = document.getElementById('modal-form-fields');

  fieldsContainer.innerHTML = `
    <div class="form-group">
      <label class="form-label">Project Title</label>
      <input type="text" id="modal-proj-title" class="form-control" value="${escapeAttr(project.title)}" required>
    </div>

    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="modal-proj-desc" class="form-control" rows="3" required>${escapeHTML(project.description)}</textarea>
    </div>

    <div class="form-group">
      <label class="form-label">Tech Stack (comma-separated)</label>
      <input type="text" id="modal-proj-tech" class="form-control" value="${escapeAttr(Array.isArray(project.tech) ? project.tech.join(', ') : '')}" placeholder="Go, Redis, WebSockets, React">
    </div>

    <div class="form-group inline">
      <div>
        <label class="form-label">GitHub Repository URL</label>
        <input type="text" id="modal-proj-github" class="form-control" value="${escapeAttr(project.githubUrl || '')}">
      </div>
      <div>
        <label class="form-label">Live Demo URL</label>
        <input type="text" id="modal-proj-live" class="form-control" value="${escapeAttr(project.liveUrl || '')}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Screenshot / Diagram Image</label>
      <div class="image-picker-group">
        <img src="/preview/${project.image || 'assets/img/projects/hyperlog.svg'}" class="image-preview-thumb" id="modal-proj-image-preview" alt="Preview">
        <input type="text" id="modal-proj-image" class="form-control" value="${escapeAttr(project.image || '')}">
        <label class="btn btn-secondary btn-file-label">
          Upload
          <input type="file" id="modal-proj-file" accept="image/*" style="display: none;">
        </label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-checkbox-label">
        <input type="checkbox" id="modal-proj-featured" ${project.featured ? 'checked' : ''}>
        <span>Featured Project (Highlighted Badge on Site)</span>
      </label>
    </div>
  `;

  // Image upload in project modal
  const fileInput = document.getElementById('modal-proj-file');
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files[0]) return;
    const uploadedPath = await uploadImageFile(fileInput.files[0], 'project');
    if (uploadedPath) {
      document.getElementById('modal-proj-image').value = uploadedPath;
      document.getElementById('modal-proj-image-preview').src = `/preview/${uploadedPath}`;
      project.image = uploadedPath;
      showToast('Project screenshot uploaded!', 'success');
    }
  });

  openModal();
}

/* --------------------------------------------------------------------------
   4. Generic List Section Tab (Education, Experience, Achievements, etc.)
   -------------------------------------------------------------------------- */
function renderListSectionTab(container, sectionKey, title, fields) {
  if (!Array.isArray(portfolioData[sectionKey])) portfolioData[sectionKey] = [];
  const list = portfolioData[sectionKey];

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>${escapeHTML(title)}</h2>
          <p>Manage entries, modify details, and reorder chronological display.</p>
        </div>
        <button id="btn-add-item" class="btn btn-primary btn-sm">+ Add Entry</button>
      </div>

      <div class="item-list-container">
        ${list.length === 0 ? '<p style="color: var(--admin-muted);">No entries added yet.</p>' : ''}
        ${list.map((item, idx) => {
          const mainField = item[fields[0].key] || 'Entry ' + (idx + 1);
          const subField = fields[1] && item[fields[1].key] ? item[fields[1].key] : '';
          return `
            <div class="list-entry-card">
              <div class="entry-info">
                <div class="entry-main-title">${escapeHTML(mainField)}</div>
                ${subField ? `<div class="entry-subtitle">${escapeHTML(subField)}</div>` : ''}
              </div>
              <div class="entry-actions">
                <button type="button" class="icon-action-btn" onclick="moveItem('${sectionKey}', ${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button type="button" class="icon-action-btn" onclick="moveItem('${sectionKey}', ${idx}, 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button type="button" class="icon-action-btn" onclick="openGenericModal('${sectionKey}', ${idx})" title="Edit">✏️</button>
                <button type="button" class="icon-action-btn delete" onclick="deleteItem('${sectionKey}', ${idx})" title="Delete">&times;</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-add-item').addEventListener('click', () => {
    openGenericModal(sectionKey, null);
  });
}

window.openGenericModal = (sectionKey, index) => {
  const isNew = index === null;
  const item = isNew ? {} : JSON.parse(JSON.stringify(portfolioData[sectionKey][index]));
  currentModalContext = { section: sectionKey, index, isNew, data: item };

  document.getElementById('modal-title').textContent = isNew ? 'Add New Entry' : 'Edit Entry';
  const fieldsContainer = document.getElementById('modal-form-fields');

  // Lookup fields specification based on current tab
  let fieldDefs = [];
  if (sectionKey === 'education') {
    fieldDefs = [
      { key: 'degree', label: 'Degree / Title', type: 'text', required: true },
      { key: 'institute', label: 'Institution / School', type: 'text', required: true },
      { key: 'years', label: 'Timeline (e.g. 2023 – 2027)', type: 'text', required: true },
      { key: 'score', label: 'Score / CGPA', type: 'text' },
      { key: 'details', label: 'Coursework & Details', type: 'textarea' }
    ];
  } else if (sectionKey === 'experience') {
    fieldDefs = [
      { key: 'role', label: 'Role / Position', type: 'text', required: true },
      { key: 'org', label: 'Organization / Company', type: 'text', required: true },
      { key: 'duration', label: 'Duration (e.g. Jun 2026 – Aug 2026)', type: 'text', required: true },
      { key: 'location', label: 'Location / Work Mode', type: 'text' },
      { key: 'description', label: 'Responsibilities & Impact', type: 'textarea', required: true }
    ];
  } else if (sectionKey === 'achievements') {
    fieldDefs = [
      { key: 'title', label: 'Milestone / Award Title', type: 'text', required: true },
      { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
      { key: 'link', label: 'Verification Link URL', type: 'text' }
    ];
  } else if (sectionKey === 'certifications') {
    fieldDefs = [
      { key: 'title', label: 'Certification Title', type: 'text', required: true },
      { key: 'issuer', label: 'Issuing Organization', type: 'text', required: true },
      { key: 'date', label: 'Issue Date (YYYY-MM)', type: 'text' },
      { key: 'link', label: 'Credential Verification URL', type: 'text' }
    ];
  } else if (sectionKey === 'codingProfiles') {
    fieldDefs = [
      { key: 'platform', label: 'Platform Name (LeetCode, Codeforces, etc.)', type: 'text', required: true },
      { key: 'handle', label: 'Username / Handle', type: 'text', required: true },
      { key: 'stats', label: 'Stats Highlight (e.g. 500+ Solved • Rating 1940+)', type: 'text', required: true },
      { key: 'url', label: 'Profile URL', type: 'text', required: true }
    ];
  } else if (sectionKey === 'extracurricular') {
    fieldDefs = [
      { key: 'title', label: 'Activity / Leadership Title', type: 'text', required: true },
      { key: 'duration', label: 'Duration (e.g. 2025 – Present)', type: 'text' },
      { key: 'description', label: 'Role Description', type: 'textarea', required: true }
    ];
  } else if (sectionKey === 'news') {
    fieldDefs = [
      { key: 'date', label: 'Date (YYYY-MM-DD or YYYY-MM)', type: 'text', required: true },
      { key: 'text', label: 'Milestone / Update Text', type: 'textarea', required: true }
    ];
  }

  fieldsContainer.innerHTML = fieldDefs.map(f => `
    <div class="form-group">
      <label class="form-label">${escapeHTML(f.label)}</label>
      ${f.type === 'textarea'
        ? `<textarea id="field-${f.key}" class="form-control" rows="3" ${f.required ? 'required' : ''}>${escapeHTML(item[f.key] || '')}</textarea>`
        : `<input type="text" id="field-${f.key}" class="form-control" value="${escapeAttr(item[f.key] || '')}" ${f.required ? 'required' : ''}>`
      }
    </div>
  `).join('');

  openModal();
};

/* --------------------------------------------------------------------------
   5. Raw JSON Editor Tab
   -------------------------------------------------------------------------- */
function renderRawJsonTab(container) {
  const jsonStr = JSON.stringify(portfolioData, null, 2);

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Raw JSON Editor</h2>
          <p>Directly view and edit the underlying <code>data/portfolio.json</code> data structure.</p>
        </div>
        <button id="btn-format-json" class="btn btn-secondary btn-sm">Format &amp; Validate</button>
      </div>

      <div class="form-group">
        <textarea id="raw-json-textarea" class="form-control code-editor-textarea" spellcheck="false">${escapeHTML(jsonStr)}</textarea>
      </div>
    </div>
  `;

  const textarea = document.getElementById('raw-json-textarea');
  textarea.addEventListener('input', () => {
    setDirty(true);
  });

  document.getElementById('btn-format-json').addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      portfolioData = parsed;
      showToast('JSON is valid and formatted!', 'success');
    } catch (err) {
      showToast(`Invalid JSON syntax: ${err.message}`, 'error');
    }
  });
}

/* --------------------------------------------------------------------------
   CRUD Actions (Move, Delete, Submit Modal)
   -------------------------------------------------------------------------- */
window.moveItem = (sectionKey, index, direction) => {
  const arr = portfolioData[sectionKey];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;

  const temp = arr[index];
  arr[index] = arr[newIndex];
  arr[newIndex] = temp;

  setDirty(true);
  renderCurrentTab();
};

window.deleteItem = (sectionKey, index) => {
  if (confirm('Are you sure you want to delete this entry?')) {
    portfolioData[sectionKey].splice(index, 1);
    setDirty(true);
    renderCurrentTab();
    showToast('Entry deleted', 'info');
  }
};

function handleModalSubmit(e) {
  e.preventDefault();
  if (!currentModalContext) return;

  const { section, index, isNew } = currentModalContext;

  if (section === 'projects') {
    const techStr = document.getElementById('modal-proj-tech').value;
    const project = {
      title: document.getElementById('modal-proj-title').value.trim(),
      description: document.getElementById('modal-proj-desc').value.trim(),
      tech: techStr.split(',').map(s => s.trim()).filter(Boolean),
      githubUrl: document.getElementById('modal-proj-github').value.trim(),
      liveUrl: document.getElementById('modal-proj-live').value.trim(),
      image: document.getElementById('modal-proj-image').value.trim(),
      featured: document.getElementById('modal-proj-featured').checked
    };

    if (isNew) {
      portfolioData.projects.push(project);
    } else {
      portfolioData.projects[index] = project;
    }
  } else {
    // Generic fields extraction
    const inputs = document.querySelectorAll('#modal-form-fields input, #modal-form-fields textarea');
    const item = {};
    inputs.forEach(input => {
      const key = input.id.replace('field-', '');
      item[key] = input.value.trim();
    });

    if (!Array.isArray(portfolioData[section])) {
      portfolioData[section] = [];
    }

    if (isNew) {
      portfolioData[section].push(item);
    } else {
      portfolioData[section][index] = item;
    }
  }

  setDirty(true);
  closeModal();
  renderCurrentTab();
  showToast(isNew ? 'New entry added!' : 'Entry updated!', 'success');
}

/* --------------------------------------------------------------------------
   Image Upload Helper
   -------------------------------------------------------------------------- */
async function uploadImageFile(file, type) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`/api/upload?type=${type}`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Upload failed');

    return result.filePath;
  } catch (err) {
    console.error('Image upload failed:', err);
    showToast(`Upload failed: ${err.message}`, 'error');
    return null;
  }
}

/* --------------------------------------------------------------------------
   Modal & Toast Helpers
   -------------------------------------------------------------------------- */
function openModal() {
  document.getElementById('item-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('item-modal').style.display = 'none';
  currentModalContext = null;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
