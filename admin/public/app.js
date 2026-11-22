/**
 * Admin Panel Client Application — Control Room
 * Full CRUD, slide-over drawer, drag/button reordering, direct image uploads,
 * live preview (420px debounced), 8-second undo on delete, raw JSON editing,
 * and reliable disk sync.
 */

let portfolioData = null;
let serverData = null; // Unmodified server copy for Discard & diffing
let currentTab = 'profile';
const dirtySections = new Set();

// Drawer & Modal state
let currentDrawerContext = null; // { section, index, isNew, data }
let deleteConfirmContext = null; // { section, index, title }
let undoTimeout = null;
let previewDebounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupNavigation();
  setupGlobalActions();
  setupDrawerAndModal();
  setupLivePreview();
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
    serverData = JSON.parse(JSON.stringify(portfolioData));
    
    dirtySections.clear();
    updateDirtyUI();
    updateSidebarCounts();
    renderCurrentTab();
    triggerLivePreview();
    showToast('Loaded portfolio data', 'info');
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    showToast(`Error loading data: ${err.message}`, 'error');
  }
}

/**
 * Mark a section as dirty (or clean) and update status pill + dots
 */
function markDirty(section, isDirty = true) {
  if (isDirty) {
    dirtySections.add(section);
  } else {
    dirtySections.delete(section);
  }
  updateDirtyUI();
  triggerLivePreview();
}

function updateDirtyUI() {
  const isDirty = dirtySections.size > 0;
  
  // Status pill
  const pill = document.getElementById('save-status-pill');
  const text = document.getElementById('save-status-text');
  if (pill && text) {
    if (isDirty) {
      pill.className = 'status-pill is-dirty';
      text.textContent = 'Unsaved changes';
    } else {
      pill.className = 'status-pill is-saved';
      text.textContent = 'All changes saved';
    }
  }

  // Action buttons
  const saveBtn = document.getElementById('btn-save-disk');
  const discardBtn = document.getElementById('btn-discard-changes');
  if (saveBtn) saveBtn.disabled = !isDirty;
  if (discardBtn) discardBtn.disabled = !isDirty;

  // Unsaved dots on sidebar items
  const allTabs = ['profile', 'skills', 'projects', 'experience', 'education', 'achievements', 'certifications', 'codingProfiles', 'extracurricular', 'news', 'rawJson'];
  allTabs.forEach(tab => {
    const dot = document.getElementById(`dot-${tab}`);
    if (dot) {
      dot.style.display = dirtySections.has(tab) ? 'inline-block' : 'none';
    }
  });
}

/**
 * Update Sidebar Count Badges
 */
function updateSidebarCounts() {
  if (!portfolioData) return;

  const setCount = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };

  const skillsCount = portfolioData.skills ? Object.keys(portfolioData.skills).length : 0;
  setCount('count-skills', skillsCount);
  setCount('count-projects', portfolioData.projects?.length || 0);
  setCount('count-experience', portfolioData.experience?.length || 0);
  setCount('count-education', portfolioData.education?.length || 0);
  setCount('count-achievements', portfolioData.achievements?.length || 0);
  setCount('count-certifications', portfolioData.certifications?.length || 0);
  setCount('count-codingProfiles', portfolioData.codingProfiles?.length || 0);
  setCount('count-extracurricular', portfolioData.extracurricular?.length || 0);
  setCount('count-news', portfolioData.news?.length || 0);
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

    serverData = JSON.parse(JSON.stringify(portfolioData));
    dirtySections.clear();
    updateDirtyUI();
    showToast('Changes saved', 'success');
  } catch (err) {
    console.error('Save error:', err);
    showToast(`Couldn't save changes. Check your connection and try again.`, 'error');
  }
}

/**
 * Discard unsaved changes and revert to server state
 */
function discardChanges() {
  if (dirtySections.size === 0) return;
  if (!serverData) return;

  portfolioData = JSON.parse(JSON.stringify(serverData));
  dirtySections.clear();
  updateDirtyUI();
  updateSidebarCounts();
  renderCurrentTab();
  triggerLivePreview();
  showToast('Discarded unsaved changes', 'info');
}

/**
 * Navigation and Sidebar Handlers
 */
function setupNavigation() {
  const navBtns = document.querySelectorAll('.sidebar-menu .nav-item');
  const sectionTitle = document.getElementById('section-header-title');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;

      const titleMap = {
        profile: 'Profile',
        skills: 'Skills',
        projects: 'Projects',
        experience: 'Experience',
        education: 'Education',
        achievements: 'Achievements',
        certifications: 'Certifications',
        codingProfiles: 'Coding Profiles',
        extracurricular: 'Extracurricular & Leadership',
        news: 'News & Changelog',
        rawJson: 'Raw JSON Editor'
      };

      if (sectionTitle) sectionTitle.textContent = titleMap[currentTab] || 'Section';
      renderCurrentTab();
      triggerLivePreview();

      // Close mobile sidebar if open
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar && sidebar.classList.contains('is-open')) {
        sidebar.classList.remove('is-open');
      }
    });
  });

  // Mobile sidebar toggle button
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }

  // Theme toggle in sidebar
  const themeToggle = document.getElementById('admin-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('admin-theme', next);
        localStorage.setItem('theme', next);
      } catch (e) {}
    });
  }
}

/**
 * Global Header Actions (Save, Discard, Export, Import, Keyboard Shortcuts)
 */
function setupGlobalActions() {
  document.getElementById('btn-save-disk').addEventListener('click', saveToDisk);
  document.getElementById('btn-discard-changes').addEventListener('click', discardChanges);

  document.getElementById('btn-export-backup').addEventListener('click', () => {
    window.location.href = '/api/backup';
  });

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
        const allTabs = ['profile', 'skills', 'projects', 'experience', 'education', 'achievements', 'certifications', 'codingProfiles', 'extracurricular', 'news'];
        allTabs.forEach(t => dirtySections.add(t));
        updateDirtyUI();
        updateSidebarCounts();
        renderCurrentTab();
        triggerLivePreview();
        showToast('JSON imported into editor! Click "Save changes" to publish.', 'success');
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
      importInput.value = '';
    };
    reader.readAsText(file);
  });

  // Keyboard shortcut: Ctrl+S / Cmd+S and Esc
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveToDisk();
    }
    if (e.key === 'Escape') {
      closeDrawer();
      closeDeleteModal();
    }
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (dirtySections.size > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

/**
 * Live Preview Controls
 */
function setupLivePreview() {
  const btnDesktop = document.getElementById('btn-preview-desktop');
  const btnMobile = document.getElementById('btn-preview-mobile');
  const stage = document.getElementById('preview-stage');
  const toggleBtn = document.getElementById('btn-toggle-preview');
  const pane = document.getElementById('live-preview-pane');

  if (btnDesktop && btnMobile && stage) {
    btnDesktop.addEventListener('click', () => {
      btnDesktop.classList.add('active');
      btnMobile.classList.remove('active');
      stage.classList.remove('is-mobile');
    });

    btnMobile.addEventListener('click', () => {
      btnMobile.classList.add('active');
      btnDesktop.classList.remove('active');
      stage.classList.add('is-mobile');
    });
  }

  if (toggleBtn && pane) {
    toggleBtn.addEventListener('click', () => {
      pane.classList.toggle('is-mobile-open');
    });
  }
}

/**
 * Debounced trigger for Live Preview
 */
function triggerLivePreview() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    renderLivePreview();
  }, 150);
}

/**
 * Render component into Live Preview Pane
 */
function renderLivePreview() {
  const stage = document.getElementById('preview-stage');
  if (!stage || !portfolioData) return;

  stage.innerHTML = '';

  try {
    switch (currentTab) {
      case 'profile': {
        const p = portfolioData.profile || {};
        const rawTagline = p.tagline || 'Building practical | scalable software solutions.';
        let lightPart = '';
        let boldPart = '';
        if (rawTagline.includes('|')) {
          const parts = rawTagline.split('|').map(x => x.trim());
          lightPart = parts[0] || '';
          boldPart = parts.slice(1).join(' ') || '';
        } else {
          boldPart = rawTagline;
        }

        stage.innerHTML = `
          <div class="hero-preview-wrapper" style="padding: 12px; background: var(--surface); border-radius: 12px; border: 1px solid var(--line);">
            <div class="hero-headline" style="margin-bottom: 14px;">
              <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; color: var(--ink-strong);">${escapeHTML(p.name || 'Barun Saha')}</h2>
              <p class="hero-tagline" style="font-size: 0.9375rem; line-height: 1.4;">
                ${lightPart ? `<span class="phrase-light">${escapeHTML(lightPart)}</span> ` : ''}
                <span class="phrase-bold">${escapeHTML(boldPart)}</span>
              </p>
            </div>
            <div class="hero-status-chip" style="margin-bottom: 14px; display: inline-flex;">
              <span class="status-dot"></span>
              <span>${escapeHTML(p.status || 'Available')}</span>
            </div>
            ${p.bio ? `<div style="font-size: 0.8125rem; color: var(--ink-soft); line-height: 1.5; margin-bottom: 14px;">${escapeHTML(p.bio)}</div>` : ''}
            <div class="hero-actions" style="margin-top: 10px;">
              ${p.resumeUrl ? `<a href="${escapeHTML(p.resumeUrl)}" target="_blank" class="btn-resume" style="font-size: 0.75rem; padding: 6px 12px;">View resume</a>` : ''}
            </div>
          </div>
        `;
        break;
      }
      case 'skills': {
        const wrap = document.createElement('div');
        wrap.className = 'skills-rows';
        stage.appendChild(wrap);
        if (typeof renderSkills === 'function') {
          renderSkills(portfolioData.skills, wrap);
        }
        break;
      }
      case 'projects': {
        const wrap = document.createElement('div');
        wrap.className = 'projects-layout';
        stage.appendChild(wrap);
        if (typeof renderProjects === 'function') {
          renderProjects(portfolioData.projects, wrap);
        }
        break;
      }
      case 'experience': {
        const wrap = document.createElement('div');
        wrap.className = 'timeline';
        stage.appendChild(wrap);
        if (typeof renderExperience === 'function') {
          renderExperience(portfolioData.experience, wrap);
        }
        break;
      }
      case 'education': {
        const wrap = document.createElement('div');
        wrap.className = 'timeline';
        stage.appendChild(wrap);
        if (typeof renderEducation === 'function') {
          renderEducation(portfolioData.education, wrap);
        }
        break;
      }
      case 'achievements': {
        const wrap = document.createElement('div');
        wrap.className = 'ledger-card';
        stage.appendChild(wrap);
        if (typeof renderAchievementsAndCerts === 'function') {
          renderAchievementsAndCerts(portfolioData.achievements, [], wrap, null);
        }
        break;
      }
      case 'certifications': {
        const wrap = document.createElement('div');
        wrap.className = 'ledger-card';
        stage.appendChild(wrap);
        if (typeof renderAchievementsAndCerts === 'function') {
          renderAchievementsAndCerts([], portfolioData.certifications, null, wrap);
        }
        break;
      }
      case 'codingProfiles': {
        const wrap = document.createElement('div');
        wrap.className = 'profiles-grid';
        stage.appendChild(wrap);
        if (typeof renderCodingProfiles === 'function') {
          renderCodingProfiles(portfolioData.codingProfiles, wrap);
        }
        break;
      }
      case 'extracurricular': {
        const wrap = document.createElement('div');
        wrap.className = 'activities-container';
        stage.appendChild(wrap);
        if (typeof renderExtracurricular === 'function') {
          renderExtracurricular(portfolioData.extracurricular, wrap);
        }
        break;
      }
      case 'news': {
        const wrap = document.createElement('div');
        wrap.className = 'ledger-card';
        stage.appendChild(wrap);
        if (typeof renderNews === 'function') {
          renderNews(portfolioData.news, wrap);
        }
        break;
      }
      case 'rawJson': {
        stage.innerHTML = `
          <div style="font-family: var(--font-mono); font-size: 11px; background: #14171F; color: #7DD3FC; padding: 12px; border-radius: 8px;">
            Valid JSON Structure • Ready to save
          </div>
        `;
        break;
      }
    }
  } catch (err) {
    console.error('Live preview error:', err);
  }
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
    case 'skills':
      renderSkillsTab(container);
      break;
    case 'projects':
      renderProjectsTab(container);
      break;
    case 'experience':
      renderExperienceTab(container);
      break;
    case 'education':
      renderEducationTab(container);
      break;
    case 'achievements':
      renderAchievementsTab(container);
      break;
    case 'certifications':
      renderCertificationsTab(container);
      break;
    case 'codingProfiles':
      renderCodingProfilesTab(container);
      break;
    case 'extracurricular':
      renderExtracurricularTab(container);
      break;
    case 'news':
      renderNewsTab(container);
      break;
    case 'rawJson':
      renderRawJsonTab(container);
      break;
  }
}

/* ==========================================================================
   1. PROFILE TAB
   ========================================================================== */
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
            <label class="form-label" for="prof-name">Full Name</label>
            <input type="text" id="prof-name" class="form-control" value="${escapeAttr(p.name || '')}" required>
          </div>
          <div>
            <label class="form-label" for="prof-tagline">Tagline</label>
            <input type="text" id="prof-tagline" class="form-control" value="${escapeAttr(p.tagline || '')}" required>
            <div class="form-hint">Appears in the hero. Put a natural break between the light and bold parts using a pipe, e.g. Building practical | scalable software.</div>
          </div>
        </div>

        <div class="form-group inline">
          <div>
            <label class="form-label" for="prof-location">Location</label>
            <input type="text" id="prof-location" class="form-control" value="${escapeAttr(p.location || '')}">
          </div>
          <div>
            <label class="form-label" for="prof-status">Availability / Status Pill</label>
            <input type="text" id="prof-status" class="form-control" value="${escapeAttr(p.status || '')}" placeholder="e.g. Open to Internships">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Profile Photo / Cutout</label>
          <div class="image-picker-group">
            <img src="/preview/${p.photo || 'assets/img/profile.svg'}" class="image-preview-thumb" id="prof-photo-preview" alt="Preview">
            <input type="text" id="prof-photo" class="form-control" value="${escapeAttr(p.photo || '')}" style="flex: 1;" placeholder="assets/img/...">
            <label class="btn btn-secondary btn-file-label">
              Upload Image
              <input type="file" id="prof-photo-file" accept="image/*" style="display: none;">
            </label>
          </div>
          <div class="form-hint">Upload head-and-shoulders portrait cutout or photo.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="prof-resume">Resume PDF File Path or URL</label>
          <input type="text" id="prof-resume" class="form-control" value="${escapeAttr(p.resumeUrl || '')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="prof-bio">About Statement</label>
          <textarea id="prof-bio" class="form-control" rows="4">${escapeHTML(p.bio || '')}</textarea>
          <div class="char-count" id="prof-bio-count">${(p.bio || '').length} characters</div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label class="form-label" style="margin-bottom: 0;">Social &amp; Contact Channels</label>
            <button type="button" id="btn-add-social" class="btn btn-secondary btn-sm">+ Add Channel</button>
          </div>
          <div id="socials-list-container" class="item-list-container"></div>
        </div>
      </form>
    </div>
  `;

  renderSocialsList();

  // Field change bindings
  ['prof-name', 'prof-tagline', 'prof-location', 'prof-status', 'prof-photo', 'prof-resume', 'prof-bio'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      p.name = document.getElementById('prof-name').value;
      p.tagline = document.getElementById('prof-tagline').value;
      p.location = document.getElementById('prof-location').value;
      p.status = document.getElementById('prof-status').value;
      p.photo = document.getElementById('prof-photo').value;
      p.resumeUrl = document.getElementById('prof-resume').value;
      p.bio = document.getElementById('prof-bio').value;

      if (id === 'prof-bio') {
        const countEl = document.getElementById('prof-bio-count');
        if (countEl) countEl.textContent = `${p.bio.length} characters`;
      }

      markDirty('profile');
    });
  });

  // Photo upload
  const fileInput = document.getElementById('prof-photo-file');
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files[0]) return;
    const uploadedPath = await uploadImageFile(fileInput.files[0], 'avatar');
    if (uploadedPath) {
      document.getElementById('prof-photo').value = uploadedPath;
      document.getElementById('prof-photo-preview').src = `/preview/${uploadedPath}`;
      p.photo = uploadedPath;
      markDirty('profile');
      showToast('Avatar uploaded successfully', 'success');
    }
  });

  document.getElementById('btn-add-social').addEventListener('click', () => {
    if (!Array.isArray(p.socials)) p.socials = [];
    p.socials.push({ platform: 'GitHub', url: 'https://github.com/' });
    markDirty('profile');
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
        <button type="button" class="icon-action-btn delete" onclick="deleteSocial(${idx})" title="Delete" aria-label="Delete channel">&times;</button>
      </div>
    </div>
  `).join('');
}

window.updateSocialField = (idx, field, value) => {
  portfolioData.profile.socials[idx][field] = value;
  markDirty('profile');
};

window.deleteSocial = (idx) => {
  portfolioData.profile.socials.splice(idx, 1);
  markDirty('profile');
  renderSocialsList();
};

/* ==========================================================================
   2. SKILLS TAB
   ========================================================================== */
function renderSkillsTab(container) {
  if (!portfolioData.skills || typeof portfolioData.skills !== 'object') {
    portfolioData.skills = {};
  }
  const skills = portfolioData.skills;

  const categoryLabels = {
    languages: 'Programming languages',
    webDev: 'Web and frameworks',
    databases: 'Databases and storage',
    toolsPlatforms: 'Tools and platforms',
    coreCS: 'Core computer science'
  };

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Skills &amp; Technologies</h2>
          <p>Grouped tag clusters displayed as definition rows on the site. Type a skill and press <strong>Enter</strong> or comma to add.</p>
        </div>
      </div>

      <div id="skills-categories-list">
        ${Object.keys(skills).map(catKey => `
          <div class="form-group" style="background: var(--surface); padding: 16px; border-radius: var(--r-field); border: 1px solid var(--line); margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="margin-bottom: 0;">${escapeHTML(categoryLabels[catKey] || catKey)} (<code>${escapeHTML(catKey)}</code>)</label>
              <button type="button" class="btn btn-secondary btn-sm" style="height: 26px; padding: 0 8px; font-size: 0.75rem;" onclick="deleteSkillCategory('${escapeAttr(catKey)}')">Remove Category</button>
            </div>
            <div class="tags-input-wrapper" id="tag-box-${catKey}">
              ${(skills[catKey] || []).map((skill, sIdx) => `
                <span class="tag-badge">
                  ${escapeHTML(skill)}
                  <button type="button" class="tag-remove-btn" onclick="removeSkillTag('${catKey}', ${sIdx})" aria-label="Remove ${escapeAttr(skill)}">&times;</button>
                </span>
              `).join('')}
              <input type="text" class="tag-text-input" placeholder="+ Add skill (press Enter)" onkeydown="handleSkillTagKeydown(event, '${catKey}')">
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line);">
        <h3 style="font-size: 0.9375rem; font-weight: 600; margin-bottom: 8px;">Add Custom Category</h3>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="new-category-key" class="form-control" placeholder="Category key (e.g. devops, cloud)" style="max-width: 320px;">
          <button type="button" id="btn-add-category" class="btn btn-secondary btn-sm">+ Add Category</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-category').addEventListener('click', () => {
    const input = document.getElementById('new-category-key');
    const key = input.value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!key) {
      showToast('Please enter an alphanumeric category key', 'error');
      return;
    }
    if (portfolioData.skills[key]) {
      showToast('Category already exists', 'error');
      return;
    }
    portfolioData.skills[key] = [];
    markDirty('skills');
    updateSidebarCounts();
    renderSkillsTab(container);
  });
}

window.removeSkillTag = (catKey, sIdx) => {
  portfolioData.skills[catKey].splice(sIdx, 1);
  markDirty('skills');
  renderCurrentTab();
};

window.deleteSkillCategory = (catKey) => {
  if (confirm(`Remove the "${catKey}" skill category and all its tags?`)) {
    delete portfolioData.skills[catKey];
    markDirty('skills');
    updateSidebarCounts();
    renderCurrentTab();
  }
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
      markDirty('skills');
      renderCurrentTab();
    }
  } else if (e.key === 'Backspace' && e.target.value === '') {
    if (portfolioData.skills[catKey]?.length > 0) {
      portfolioData.skills[catKey].pop();
      markDirty('skills');
      renderCurrentTab();
    }
  }
};

/* ==========================================================================
   3. PROJECTS TAB
   ========================================================================== */
function renderProjectsTab(container) {
  if (!Array.isArray(portfolioData.projects)) portfolioData.projects = [];
  const projects = portfolioData.projects;

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Projects Management</h2>
          <p>Featured projects appear as full-width slabs; other projects display in the 2-column grid.</p>
        </div>
        <button id="btn-add-project" class="btn btn-primary btn-sm">+ Add Project</button>
      </div>

      <div class="item-list-container">
        ${projects.length === 0 ? `
          <div class="empty-state-card">
            <div class="empty-state-title">No projects yet</div>
            <p>Add your first project to show it on your site.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="openProjectDrawer(null)">+ Add Project</button>
          </div>
        ` : ''}
        ${projects.map((proj, idx) => `
          <div class="list-entry-card">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
              <button type="button" class="drag-handle-btn" title="Reorder" aria-hidden="true">&#x283F;</button>
              <img src="/preview/${proj.image || 'assets/img/projects/hyperlog.svg'}" style="width: 46px; height: 32px; object-fit: cover; border-radius: 4px; background: #14171F;" alt="">
              <div class="entry-info">
                <div class="entry-main-title">
                  ${proj.featured ? '<span class="entry-badge" style="color: #B45309; background: #FEF3C7;">Featured</span>' : ''}
                  ${escapeHTML(proj.title)}
                </div>
                <div class="entry-subtitle">${escapeHTML(Array.isArray(proj.tech) ? proj.tech.join(', ') : '')}</div>
              </div>
            </div>
            <div class="entry-actions">
              <button type="button" class="icon-action-btn" onclick="moveItem('projects', ${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up" aria-label="Move ${escapeAttr(proj.title)} up">&uarr;</button>
              <button type="button" class="icon-action-btn" onclick="moveItem('projects', ${idx}, 1)" ${idx === projects.length - 1 ? 'disabled' : ''} title="Move Down" aria-label="Move ${escapeAttr(proj.title)} down">&darr;</button>
              <button type="button" class="icon-action-btn" onclick="openProjectDrawer(${idx})" title="Edit" aria-label="Edit ${escapeAttr(proj.title)}">&#x270E;</button>
              <button type="button" class="icon-action-btn delete" onclick="confirmDelete('projects', ${idx})" title="Delete" aria-label="Delete ${escapeAttr(proj.title)}">&times;</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-add-project').addEventListener('click', () => {
    openProjectDrawer(null);
  });
}

function openProjectDrawer(index) {
  const isNew = index === null;
  const project = isNew ? {
    title: '',
    description: '',
    tech: [],
    githubUrl: '',
    liveUrl: '',
    image: '',
    featured: false
  } : JSON.parse(JSON.stringify(portfolioData.projects[index]));

  currentDrawerContext = { section: 'projects', index, isNew, data: project };

  const titleEl = document.getElementById('drawer-title');
  if (titleEl) titleEl.textContent = isNew ? 'Add Project' : 'Edit Project';

  const fieldsContainer = document.getElementById('drawer-form-fields');
  fieldsContainer.innerHTML = `
    <div class="form-group" id="group-proj-title">
      <label class="form-label" for="proj-title">Project Title</label>
      <input type="text" id="proj-title" class="form-control" value="${escapeAttr(project.title)}" required>
      <div class="form-error">Title is required.</div>
    </div>

    <div class="form-group" id="group-proj-desc">
      <label class="form-label" for="proj-desc">Description</label>
      <textarea id="proj-desc" class="form-control" rows="3" required>${escapeHTML(project.description)}</textarea>
      <div class="char-count" id="proj-desc-count">${(project.description || '').length} characters</div>
      <div class="form-error">Description is required.</div>
    </div>

    <div class="form-group">
      <label class="form-label">Tech Stack Tags</label>
      <div class="tags-input-wrapper" id="proj-tech-wrapper">
        ${(Array.isArray(project.tech) ? project.tech : []).map((t, tIdx) => `
          <span class="tag-badge">
            ${escapeHTML(t)}
            <button type="button" class="tag-remove-btn" onclick="removeDrawerTag('tech', ${tIdx})">&times;</button>
          </span>
        `).join('')}
        <input type="text" class="tag-text-input" placeholder="+ Add tech (press Enter)" id="proj-tech-input">
      </div>
      <div class="form-hint">Type a technology name and press Enter or comma.</div>
    </div>

    <div class="form-group inline">
      <div id="group-proj-github">
        <label class="form-label" for="proj-github">GitHub Repository URL</label>
        <input type="text" id="proj-github" class="form-control" value="${escapeAttr(project.githubUrl || '')}" placeholder="https://github.com/...">
        <div class="form-error">Enter a full link starting with https://.</div>
      </div>
      <div id="group-proj-live">
        <label class="form-label" for="proj-live">Live Demo URL</label>
        <input type="text" id="proj-live" class="form-control" value="${escapeAttr(project.liveUrl || '')}" placeholder="https://...">
        <div class="form-error">Enter a full link starting with https://.</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Project Cover / Screenshot</label>
      <div class="image-picker-group">
        <img src="/preview/${project.image || 'assets/img/projects/hyperlog.svg'}" class="image-preview-thumb" id="proj-image-preview" alt="Preview">
        <input type="text" id="proj-image" class="form-control" value="${escapeAttr(project.image || '')}" placeholder="assets/img/projects/..." style="flex: 1;">
        <label class="btn btn-secondary btn-file-label">
          Upload
          <input type="file" id="proj-image-file" accept="image/*" style="display: none;">
        </label>
      </div>
      <div class="form-hint">If left empty, a live code terminal cover will be generated automatically.</div>
    </div>

    <div class="form-group">
      <label class="form-checkbox-label">
        <input type="checkbox" id="proj-featured" ${project.featured ? 'checked' : ''}>
        <span>Featured project (displays as top full-width slab on public site)</span>
      </label>
    </div>
  `;

  // Desc character counter
  const descEl = document.getElementById('proj-desc');
  const countEl = document.getElementById('proj-desc-count');
  if (descEl && countEl) {
    descEl.addEventListener('input', () => {
      countEl.textContent = `${descEl.value.length} characters`;
    });
  }

  // Tech tags input handler
  const techInput = document.getElementById('proj-tech-input');
  if (techInput) {
    techInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = techInput.value.trim().replace(/,$/, '');
        if (val) {
          if (!Array.isArray(project.tech)) project.tech = [];
          project.tech.push(val);
          techInput.value = '';
          refreshDrawerTechTags(project.tech);
        }
      } else if (e.key === 'Backspace' && techInput.value === '') {
        if (project.tech?.length > 0) {
          project.tech.pop();
          refreshDrawerTechTags(project.tech);
        }
      }
    });
  }

  // Image upload
  const fileInput = document.getElementById('proj-image-file');
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      if (!fileInput.files[0]) return;
      const uploadedPath = await uploadImageFile(fileInput.files[0], 'project');
      if (uploadedPath) {
        document.getElementById('proj-image').value = uploadedPath;
        document.getElementById('proj-image-preview').src = `/preview/${uploadedPath}`;
        project.image = uploadedPath;
        showToast('Project screenshot uploaded', 'success');
      }
    });
  }

  openDrawer();
}

function refreshDrawerTechTags(techList) {
  const wrapper = document.getElementById('proj-tech-wrapper');
  if (!wrapper) return;
  wrapper.querySelectorAll('.tag-badge').forEach(b => b.remove());

  techList.forEach((t, idx) => {
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.innerHTML = `${escapeHTML(t)}<button type="button" class="tag-remove-btn" onclick="removeDrawerTag('tech', ${idx})">&times;</button>`;
    wrapper.insertBefore(badge, document.getElementById('proj-tech-input'));
  });
}

window.removeDrawerTag = (field, idx) => {
  if (currentDrawerContext && currentDrawerContext.data[field]) {
    currentDrawerContext.data[field].splice(idx, 1);
    refreshDrawerTechTags(currentDrawerContext.data[field]);
  }
};

/* ==========================================================================
   4. GENERIC LIST SECTION TABS (Experience, Education, etc.)
   ========================================================================== */
function renderExperienceTab(container) {
  renderListSection(container, {
    sectionKey: 'experience',
    title: 'Experience & Industry Roles',
    description: 'Work experience, internships, and research roles.',
    singularName: 'experience',
    fields: [
      { key: 'role', label: 'Role / Position', type: 'text', required: true },
      { key: 'org', label: 'Organization / Company', type: 'text', required: true },
      { key: 'duration', label: 'Duration (e.g. Jun 2026 – Aug 2026)', type: 'text', required: true },
      { key: 'location', label: 'Location / Work Mode', type: 'text' },
      { key: 'description', label: 'Responsibilities & Impact', type: 'multiline', required: true, hint: 'One bullet per line.' }
    ]
  });
}

function renderEducationTab(container) {
  renderListSection(container, {
    sectionKey: 'education',
    title: 'Education History',
    description: 'Academic qualifications, universities, and scores.',
    singularName: 'education',
    fields: [
      { key: 'degree', label: 'Degree / Program', type: 'text', required: true },
      { key: 'institute', label: 'Institution / School', type: 'text', required: true },
      { key: 'years', label: 'Timeline (e.g. 2023 – 2027)', type: 'text', required: true },
      { key: 'score', label: 'Score / CGPA', type: 'text' },
      { key: 'details', label: 'Coursework & Details', type: 'textarea' }
    ]
  });
}

function renderAchievementsTab(container) {
  renderListSection(container, {
    sectionKey: 'achievements',
    title: 'Achievements & Milestones',
    description: 'Contests, hackathons, and published milestones.',
    singularName: 'achievement',
    fields: [
      { key: 'title', label: 'Milestone Title', type: 'text', required: true },
      { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
      { key: 'link', label: 'Verification URL', type: 'url' }
    ]
  });
}

function renderCertificationsTab(container) {
  renderListSection(container, {
    sectionKey: 'certifications',
    title: 'Certifications & Credentials',
    description: 'Professional credentials and course completions.',
    singularName: 'certification',
    fields: [
      { key: 'title', label: 'Certification Title', type: 'text', required: true },
      { key: 'issuer', label: 'Issuing Organization', type: 'text', required: true },
      { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
      { key: 'link', label: 'Verification URL', type: 'url' }
    ]
  });
}

function renderCodingProfilesTab(container) {
  renderListSection(container, {
    sectionKey: 'codingProfiles',
    title: 'Coding Profiles',
    description: 'Competitive programming handles and platform metrics.',
    singularName: 'profile',
    fields: [
      { key: 'platform', label: 'Platform Name (LeetCode, GitHub, etc.)', type: 'text', required: true },
      { key: 'handle', label: 'Username / Handle', type: 'text', required: true },
      { key: 'stats', label: 'Stats Highlight (e.g. 200+ solved)', type: 'text', required: true },
      { key: 'url', label: 'Profile URL', type: 'url', required: true }
    ]
  });
}

function renderExtracurricularTab(container) {
  renderListSection(container, {
    sectionKey: 'extracurricular',
    title: 'Extracurricular & Leadership',
    description: 'Club leadership, community roles, and extracurriculars.',
    singularName: 'activity',
    fields: [
      { key: 'title', label: 'Activity / Leadership Title', type: 'text', required: true },
      { key: 'duration', label: 'Duration (e.g. 2025 – Present)', type: 'text' },
      { key: 'description', label: 'Description & Contributions', type: 'multiline', required: true, hint: 'One bullet per line.' }
    ]
  });
}

function renderNewsTab(container) {
  renderListSection(container, {
    sectionKey: 'news',
    title: 'News & Milestone Timeline',
    description: 'Changelog updates and chronological announcements.',
    singularName: 'update',
    fields: [
      { key: 'date', label: 'Date (YYYY-MM-DD or YYYY-MM)', type: 'text', required: true },
      { key: 'text', label: 'Milestone / Update Text', type: 'textarea', required: true }
    ]
  });
}

function renderListSection(container, config) {
  const { sectionKey, title, description, singularName, fields } = config;
  if (!Array.isArray(portfolioData[sectionKey])) portfolioData[sectionKey] = [];
  const list = portfolioData[sectionKey];

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>${escapeHTML(title)}</h2>
          <p>${escapeHTML(description)}</p>
        </div>
        <button id="btn-add-${sectionKey}" class="btn btn-primary btn-sm">+ Add ${capitalize(singularName)}</button>
      </div>

      <div class="item-list-container">
        ${list.length === 0 ? `
          <div class="empty-state-card">
            <div class="empty-state-title">No ${escapeHTML(singularName)}s yet</div>
            <p>Add your first ${escapeHTML(singularName)} to show it on your site.</p>
            <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="openGenericDrawer('${sectionKey}', null)">+ Add ${capitalize(singularName)}</button>
          </div>
        ` : ''}
        ${list.map((item, idx) => {
          const mainField = item[fields[0].key] || `${capitalize(singularName)} ${idx + 1}`;
          const subField = fields[1] && item[fields[1].key] ? item[fields[1].key] : '';
          return `
            <div class="list-entry-card">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
                <button type="button" class="drag-handle-btn" title="Reorder" aria-hidden="true">&#x283F;</button>
                <div class="entry-info">
                  <div class="entry-main-title">${escapeHTML(mainField)}</div>
                  ${subField ? `<div class="entry-subtitle">${escapeHTML(subField)}</div>` : ''}
                </div>
              </div>
              <div class="entry-actions">
                <button type="button" class="icon-action-btn" onclick="moveItem('${sectionKey}', ${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up" aria-label="Move entry up">&uarr;</button>
                <button type="button" class="icon-action-btn" onclick="moveItem('${sectionKey}', ${idx}, 1)" ${idx === list.length - 1 ? 'disabled' : ''} title="Move Down" aria-label="Move entry down">&darr;</button>
                <button type="button" class="icon-action-btn" onclick="openGenericDrawer('${sectionKey}', ${idx})" title="Edit" aria-label="Edit entry">&#x270E;</button>
                <button type="button" class="icon-action-btn delete" onclick="confirmDelete('${sectionKey}', ${idx})" title="Delete" aria-label="Delete entry">&times;</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById(`btn-add-${sectionKey}`).addEventListener('click', () => {
    openGenericDrawer(sectionKey, null);
  });
}

function openGenericDrawer(sectionKey, index) {
  const isNew = index === null;
  const item = isNew ? {} : JSON.parse(JSON.stringify(portfolioData[sectionKey][index]));
  currentDrawerContext = { section: sectionKey, index, isNew, data: item };

  // Fetch field definitions
  let config = getSectionConfig(sectionKey);
  const titleEl = document.getElementById('drawer-title');
  if (titleEl) titleEl.textContent = isNew ? `Add ${capitalize(config.singularName)}` : `Edit ${capitalize(config.singularName)}`;

  const fieldsContainer = document.getElementById('drawer-form-fields');
  fieldsContainer.innerHTML = config.fields.map(f => {
    const val = item[f.key] || '';
    const isRequired = !!f.required;
    const isMultiline = f.type === 'multiline' || f.type === 'textarea';

    return `
      <div class="form-group" id="group-field-${f.key}">
        <label class="form-label" for="field-${f.key}">${escapeHTML(f.label)}</label>
        ${isMultiline ? `
          <textarea id="field-${f.key}" class="form-control" rows="4" ${isRequired ? 'required' : ''}>${escapeHTML(val)}</textarea>
          <div class="char-count" id="count-field-${f.key}">${val.length} characters</div>
        ` : `
          <input type="${f.type === 'url' ? 'url' : 'text'}" id="field-${f.key}" class="form-control" value="${escapeAttr(val)}" ${isRequired ? 'required' : ''} placeholder="${f.type === 'url' ? 'https://...' : ''}">
        `}
        ${f.hint ? `<div class="form-hint">${escapeHTML(f.hint)}</div>` : ''}
        <div class="form-error">${escapeHTML(f.label)} is required.</div>
      </div>
    `;
  }).join('');

  // Attach char counters
  config.fields.forEach(f => {
    if (f.type === 'multiline' || f.type === 'textarea') {
      const input = document.getElementById(`field-${f.key}`);
      const counter = document.getElementById(`count-field-${f.key}`);
      if (input && counter) {
        input.addEventListener('input', () => {
          counter.textContent = `${input.value.length} characters`;
        });
      }
    }
  });

  openDrawer();
}

function getSectionConfig(key) {
  switch (key) {
    case 'experience':
      return {
        singularName: 'experience',
        fields: [
          { key: 'role', label: 'Role / Position', type: 'text', required: true },
          { key: 'org', label: 'Organization / Company', type: 'text', required: true },
          { key: 'duration', label: 'Duration (e.g. Jun 2026 – Aug 2026)', type: 'text', required: true },
          { key: 'location', label: 'Location / Work Mode', type: 'text' },
          { key: 'description', label: 'Responsibilities & Impact', type: 'multiline', required: true, hint: 'One bullet per line.' }
        ]
      };
    case 'education':
      return {
        singularName: 'education',
        fields: [
          { key: 'degree', label: 'Degree / Program', type: 'text', required: true },
          { key: 'institute', label: 'Institution / School', type: 'text', required: true },
          { key: 'years', label: 'Timeline (e.g. 2023 – 2027)', type: 'text', required: true },
          { key: 'score', label: 'Score / CGPA', type: 'text' },
          { key: 'details', label: 'Coursework & Details', type: 'textarea' }
        ]
      };
    case 'achievements':
      return {
        singularName: 'achievement',
        fields: [
          { key: 'title', label: 'Milestone Title', type: 'text', required: true },
          { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
          { key: 'link', label: 'Verification URL', type: 'url' }
        ]
      };
    case 'certifications':
      return {
        singularName: 'certification',
        fields: [
          { key: 'title', label: 'Certification Title', type: 'text', required: true },
          { key: 'issuer', label: 'Issuing Organization', type: 'text', required: true },
          { key: 'date', label: 'Date (YYYY-MM)', type: 'text' },
          { key: 'link', label: 'Verification URL', type: 'url' }
        ]
      };
    case 'codingProfiles':
      return {
        singularName: 'profile',
        fields: [
          { key: 'platform', label: 'Platform Name', type: 'text', required: true },
          { key: 'handle', label: 'Username / Handle', type: 'text', required: true },
          { key: 'stats', label: 'Stats Highlight', type: 'text', required: true },
          { key: 'url', label: 'Profile URL', type: 'url', required: true }
        ]
      };
    case 'extracurricular':
      return {
        singularName: 'activity',
        fields: [
          { key: 'title', label: 'Activity / Leadership Title', type: 'text', required: true },
          { key: 'duration', label: 'Duration (e.g. 2025 – Present)', type: 'text' },
          { key: 'description', label: 'Description & Contributions', type: 'multiline', required: true, hint: 'One bullet per line.' }
        ]
      };
    case 'news':
      return {
        singularName: 'update',
        fields: [
          { key: 'date', label: 'Date (YYYY-MM-DD or YYYY-MM)', type: 'text', required: true },
          { key: 'text', label: 'Milestone / Update Text', type: 'textarea', required: true }
        ]
      };
    default:
      return { singularName: 'entry', fields: [] };
  }
}

/* ==========================================================================
   5. RAW JSON TAB
   ========================================================================== */
function renderRawJsonTab(container) {
  const jsonStr = JSON.stringify(portfolioData, null, 2);

  container.innerHTML = `
    <div class="section-panel">
      <div class="panel-header">
        <div>
          <h2>Raw JSON Editor</h2>
          <p>Directly edit the underlying <code>data/portfolio.json</code> data contract.</p>
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
    markDirty('rawJson');
  });

  document.getElementById('btn-format-json').addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      portfolioData = parsed;
      markDirty('rawJson');
      updateSidebarCounts();
      showToast('JSON syntax is valid and formatted', 'success');
    } catch (err) {
      showToast(`Invalid JSON syntax: ${err.message}`, 'error');
    }
  });
}

/* ==========================================================================
   DRAWER & MODAL MANAGEMENT
   ========================================================================== */
function setupDrawerAndModal() {
  // Drawer close events
  document.getElementById('btn-drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('btn-drawer-cancel').addEventListener('click', closeDrawer);
  document.getElementById('drawer-form').addEventListener('submit', handleDrawerSubmit);

  // Delete modal events
  document.getElementById('btn-delete-modal-close').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-confirm').addEventListener('click', executeDelete);
}

function openDrawer() {
  const container = document.getElementById('drawer-container');
  if (container) {
    container.classList.add('is-open');
    container.setAttribute('aria-hidden', 'false');
    // Focus first input
    const firstInput = container.querySelector('input, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }
}

function closeDrawer() {
  const container = document.getElementById('drawer-container');
  if (container) {
    container.classList.remove('is-open');
    container.setAttribute('aria-hidden', 'true');
    currentDrawerContext = null;
  }
}

function handleDrawerSubmit(e) {
  e.preventDefault();
  if (!currentDrawerContext) return;

  const { section, index, isNew } = currentDrawerContext;
  let hasError = false;

  // Clear previous error states
  document.querySelectorAll('.form-group.has-error').forEach(el => el.classList.remove('has-error'));

  if (section === 'projects') {
    const title = document.getElementById('proj-title').value.trim();
    const desc = document.getElementById('proj-desc').value.trim();
    const github = document.getElementById('proj-github').value.trim();
    const live = document.getElementById('proj-live').value.trim();
    const image = document.getElementById('proj-image').value.trim();
    const featured = document.getElementById('proj-featured').checked;

    if (!title) {
      document.getElementById('group-proj-title').classList.add('has-error');
      hasError = true;
    }
    if (!desc) {
      document.getElementById('group-proj-desc').classList.add('has-error');
      hasError = true;
    }
    if (github && !/^https?:\/\//i.test(github)) {
      document.getElementById('group-proj-github').classList.add('has-error');
      hasError = true;
    }
    if (live && !/^https?:\/\//i.test(live)) {
      document.getElementById('group-proj-live').classList.add('has-error');
      hasError = true;
    }

    if (hasError) return;

    const project = {
      title,
      description: desc,
      tech: currentDrawerContext.data.tech || [],
      githubUrl: github,
      liveUrl: live,
      image,
      featured
    };

    if (isNew) {
      portfolioData.projects.push(project);
    } else {
      portfolioData.projects[index] = project;
    }

    markDirty('projects');
    updateSidebarCounts();
    closeDrawer();
    renderCurrentTab();
    showToast(isNew ? 'Project added' : 'Project updated', 'success');

  } else {
    const config = getSectionConfig(section);
    const item = {};

    config.fields.forEach(f => {
      const el = document.getElementById(`field-${f.key}`);
      const val = el ? el.value.trim() : '';

      if (f.required && !val) {
        document.getElementById(`group-field-${f.key}`).classList.add('has-error');
        hasError = true;
      }
      if (f.type === 'url' && val && !/^https?:\/\//i.test(val) && !/^mailto:/i.test(val)) {
        document.getElementById(`group-field-${f.key}`).classList.add('has-error');
        hasError = true;
      }

      item[f.key] = val;
    });

    if (hasError) return;

    if (!Array.isArray(portfolioData[section])) {
      portfolioData[section] = [];
    }

    if (isNew) {
      portfolioData[section].push(item);
    } else {
      portfolioData[section][index] = item;
    }

    markDirty(section);
    updateSidebarCounts();
    closeDrawer();
    renderCurrentTab();
    showToast(isNew ? `${capitalize(config.singularName)} added` : `${capitalize(config.singularName)} updated`, 'success');
  }
}

/* ==========================================================================
   DELETE WITH 8-SECOND UNDO
   ========================================================================== */
function confirmDelete(section, index) {
  const item = portfolioData[section][index];
  if (!item) return;

  const title = item.title || item.role || item.degree || item.platform || 'this entry';
  deleteConfirmContext = { section, index, title };

  const modal = document.getElementById('delete-modal');
  const modalTitle = document.getElementById('delete-modal-title');
  const modalText = document.getElementById('delete-modal-text');

  if (modalTitle) modalTitle.textContent = `Delete ${escapeHTML(title)}?`;
  if (modalText) modalText.textContent = `Are you sure you want to delete "${escapeHTML(title)}"? This removes it from your site.`;
  if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) modal.style.display = 'none';
  deleteConfirmContext = null;
}

function executeDelete() {
  if (!deleteConfirmContext) return;

  const { section, index, title } = deleteConfirmContext;
  const deletedItem = portfolioData[section].splice(index, 1)[0];
  closeDeleteModal();

  markDirty(section);
  updateSidebarCounts();
  renderCurrentTab();

  // Show Toast with 8-second Undo
  showToastWithUndo(`${title} deleted`, () => {
    // Undo action
    portfolioData[section].splice(index, 0, deletedItem);
    markDirty(section);
    updateSidebarCounts();
    renderCurrentTab();
    showToast(`Restored "${title}"`, 'success');
  });
}

function showToastWithUndo(message, onUndo) {
  clearTimeout(undoTimeout);

  const container = document.getElementById('toast-container');
  if (!container) return;

  container.innerHTML = ''; // Keep active toast clean

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
    <button type="button" class="toast-undo-btn">Undo</button>
  `;

  const undoBtn = toast.querySelector('.toast-undo-btn');
  undoBtn.addEventListener('click', () => {
    toast.remove();
    clearTimeout(undoTimeout);
    onUndo();
  });

  container.appendChild(toast);

  undoTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 8000);
}

/* ==========================================================================
   REORDERING (Move Up / Down)
   ========================================================================== */
window.moveItem = (sectionKey, index, direction) => {
  const arr = portfolioData[sectionKey];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= arr.length) return;

  const temp = arr[index];
  arr[index] = arr[newIndex];
  arr[newIndex] = temp;

  markDirty(sectionKey);
  renderCurrentTab();
};

/* ==========================================================================
   IMAGE UPLOAD HELPER
   ========================================================================== */
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

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
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

/* ==========================================================================
   UTILITIES
   ========================================================================== */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
