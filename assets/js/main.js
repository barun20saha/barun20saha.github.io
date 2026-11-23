/**
 * Portfolio Main JavaScript
 * Dynamic client-side rendering from data/portfolio.json
 * Dependency-free, vanilla ES6+
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('top') || document.getElementById('hero') || document.getElementById('main-content')) {
    initPortfolio();
  }
});

async function initPortfolio() {
  const loadingEl = document.getElementById('loading-indicator');
  const errorEl = document.getElementById('error-message');
  const contentEl = document.getElementById('main-content');

  try {
    const res = await fetch('data/portfolio.json', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`Failed to load data (HTTP ${res.status}: ${res.statusText})`);
    }

    const data = await res.json();

    // Set page metadata dynamically
    updateMetadata(data.profile);

    // Render all components
    renderHeroProfile(data.profile);
    initTerminalTyper(data);
    renderAbout(data.profile, data.education);
    renderEducation(data.education);
    renderSkills(data.skills);
    renderProjects(data.projects);
    renderExperience(data.experience);
    renderAchievementsAndCerts(data.achievements, data.certifications);
    renderCodingProfiles(data.codingProfiles);
    renderExtracurricular(data.extracurricular);
    renderNews(data.news);
    renderFooter(data.profile);

    // Setup interactive events
    initThemeToggle();
    setupHeaderAndMobileNav(data.profile);

    // Hide loader, show content
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';

  } catch (err) {
    console.error('Portfolio initialization error:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      const detail = errorEl.querySelector('.error-details');
      if (detail) detail.textContent = err.message;
    }
  }
}

/**
 * Updates dynamic meta tags and title for SEO and social sharing
 */
function updateMetadata(profile) {
  if (!profile) return;
  
  if (profile.name && profile.tagline) {
    document.title = `${profile.name} | ${profile.tagline}`;
  }
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && profile.bio) {
    metaDesc.setAttribute('content', profile.bio);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && profile.name) {
    ogTitle.setAttribute('content', `${profile.name} — Portfolio`);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && profile.bio) {
    ogDesc.setAttribute('content', profile.bio);
  }
}

/**
 * Simulates an engineer's terminal typing session in the Hero
 * Orchestrated load sequence (approx 2.6s total):
 * Commands type character by character (14ms per char, 250ms pause)
 * Prints [ONLINE] -> draws dashed connector, raises portrait, scales sun circle
 */
function initTerminalTyper(data) {
  const terminalEl = document.getElementById('terminal-content');
  if (!terminalEl) return;

  const profile = data.profile || {};
  const skills = data.skills || {};
  const langStr = Array.isArray(skills.languages) ? skills.languages.slice(0, 6).join(', ') : 'C, C++, Python, Java, SQL, MongoDB';
  const interests = 'Distributed Systems, High-Performance Web & Multimodal AI';
  const statusStr = profile.status || 'Open to Software Engineering Internships';

  const terminalLines = [
    { type: 'cmd', text: 'whoami' },
    { type: 'output', text: `${profile.name || 'Barun Saha'}: B.Tech CSE Student | Building scalable systems` },
    { type: 'cmd', text: 'cat core_stack.txt' },
    { type: 'output', text: `Languages: ${langStr}` },
    { type: 'cmd', text: 'cat interests.txt' },
    { type: 'output', text: interests },
    { type: 'cmd', text: 'curl -s https://status.local' },
    { type: 'output', text: `[ONLINE] ${statusStr}`, isOnline: true }
  ];

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderFinal() {
    terminalEl.innerHTML = terminalLines.map(line => {
      if (line.type === 'cmd') {
        return `<div class="cmd-line"><span class="cmd-prompt">$</span> <span class="cmd-text">${escapeHTML(line.text)}</span></div>`;
      } else {
        const onlineClass = line.isOnline ? ' cmd-online' : '';
        return `<div class="cmd-output${onlineClass}">&gt; ${escapeHTML(line.text)}</div>`;
      }
    }).join('') + '<div class="cmd-line"><span class="cmd-prompt">$</span> <span class="cursor-blink">▌</span></div>';

    document.documentElement.classList.add('hero-online');
    setTimeout(() => {
      const cursor = terminalEl.querySelector('.cursor-blink');
      if (cursor) cursor.classList.add('cursor-stopped');
    }, 8000);
  }

  if (prefersReduced) {
    renderFinal();
    return;
  }

  let isSkipped = false;
  const skipSequence = () => {
    if (isSkipped) return;
    isSkipped = true;
    renderFinal();
  };

  const heroSection = document.getElementById('top') || document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('click', skipSequence, { once: true });
    heroSection.addEventListener('keydown', skipSequence, { once: true });
  }

  terminalEl.innerHTML = '';

  async function runSequence() {
    for (const item of terminalLines) {
      if (isSkipped) return;

      if (item.type === 'cmd') {
        const lineEl = document.createElement('div');
        lineEl.className = 'cmd-line';
        lineEl.innerHTML = `<span class="cmd-prompt">$</span> <span class="cmd-text"></span><span class="cursor-blink">▌</span>`;
        terminalEl.appendChild(lineEl);
        const textSpan = lineEl.querySelector('.cmd-text');

        for (let i = 0; i < item.text.length; i++) {
          if (isSkipped) return;
          textSpan.textContent += item.text[i];
          await new Promise(r => setTimeout(r, 14));
        }

        const cursor = lineEl.querySelector('.cursor-blink');
        if (cursor) cursor.remove();
        await new Promise(r => setTimeout(r, 220));

      } else {
        const outEl = document.createElement('div');
        outEl.className = 'cmd-output' + (item.isOnline ? ' cmd-online' : '');
        outEl.textContent = `> ${item.text}`;
        terminalEl.appendChild(outEl);

        if (item.isOnline) {
          document.documentElement.classList.add('hero-online');
        }
        await new Promise(r => setTimeout(r, 160));
      }
    }

    if (isSkipped) return;
    const finalPrompt = document.createElement('div');
    finalPrompt.className = 'cmd-line';
    finalPrompt.innerHTML = `<span class="cmd-prompt">$</span> <span class="cursor-blink">▌</span>`;
    terminalEl.appendChild(finalPrompt);

    setTimeout(() => {
      const cursor = finalPrompt.querySelector('.cursor-blink');
      if (cursor) cursor.classList.add('cursor-stopped');
    }, 8000);
  }

  setTimeout(runSequence, 200);
}

/**
 * Render Hero Profile Action Card & Cutout Fallback
 */
function renderHeroProfile(profile) {
  if (!profile) return;

  const nameEl = document.getElementById('hero-name');
  if (nameEl && profile.name) {
    nameEl.textContent = profile.name;
  }

  const taglineEl = document.getElementById('hero-tagline');
  if (taglineEl) {
    const rawTagline = profile.tagline || 'Building practical | scalable software solutions.';
    let lightPart = '';
    let boldPart = '';
    if (rawTagline.includes('|')) {
      const parts = rawTagline.split('|').map(p => p.trim());
      lightPart = parts[0] || '';
      boldPart = parts.slice(1).join(' ') || '';
    } else {
      const words = rawTagline.split(' ');
      if (words.length > 3) {
        lightPart = words.slice(0, 2).join(' ');
        boldPart = words.slice(2).join(' ');
      } else {
        boldPart = rawTagline;
      }
    }
    taglineEl.innerHTML = `
      ${lightPart ? `<span class="phrase-light">${escapeHTML(lightPart)}</span>` : ''}
      <span class="phrase-bold">${escapeHTML(boldPart)}</span>
    `;
  }

  // Portrait cutout with fallback check
  const portraitImg = document.getElementById('hero-portrait-img');
  const portraitStage = document.querySelector('.hero-portrait-stage');
  if (portraitImg) {
    portraitImg.alt = profile.name || 'Barun Saha';
    const cutoutImg = new Image();
    cutoutImg.onload = () => {
      portraitImg.src = 'assets/portrait-cutout.webp';
      if (portraitStage) portraitStage.classList.remove('is-fallback');
    };
    cutoutImg.onerror = () => {
      portraitImg.src = profile.photo || 'assets/img/barun-saha.jpg';
      if (portraitStage) portraitStage.classList.add('is-fallback');
    };
    cutoutImg.src = 'assets/portrait-cutout.webp';
  }

  const statusEl = document.getElementById('hero-status-text');
  if (statusEl && profile.status) {
    statusEl.textContent = profile.status;
  }

  const resumeBtn = document.getElementById('hero-resume-btn');
  if (resumeBtn) {
    if (profile.resumeUrl) {
      resumeBtn.href = profile.resumeUrl;
      resumeBtn.innerHTML = (window.Icons ? window.Icons.svg('file-text', { size: 16 }) : '') + '<span>View resume</span>';
      resumeBtn.style.display = 'inline-flex';
    } else {
      resumeBtn.style.display = 'none';
    }
  }

  const socialsContainer = document.getElementById('hero-socials');
  if (socialsContainer && Array.isArray(profile.socials)) {
    socialsContainer.innerHTML = profile.socials.map(s => {
      let href = s.url || '';
      if (s.platform.toLowerCase().includes('mail') && !href.startsWith('mailto:')) {
        href = 'mailto:' + href;
      }
      const iconSvg = getSocialIconSvg(s.platform, href);
      return `
        <a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="${escapeHTML(s.platform)}" aria-label="${escapeHTML(s.platform)} (opens in a new tab)">
          ${iconSvg}
        </a>
      `;
    }).join('');
  }
}

/**
 * Render About section & Quick facts
 * Left: large statement (weight 300 olive + weight 700 bold key phrases)
 * Right: facts as a clean code block
 */
function renderAbout(profile, education) {
  const statementEl = document.getElementById('about-bio-statement');
  const factsEl = document.getElementById('about-facts-block');
  if (!profile) return;

  if (statementEl && profile.bio) {
    let bioHtml = escapeHTML(profile.bio);
    const keyPhrases = [
      'software engineering and application development',
      'reliable and scalable software solutions',
      'programming, data structures, databases, and modern development technologies'
    ];
    keyPhrases.forEach(phrase => {
      const escaped = escapeHTML(phrase);
      if (bioHtml.includes(escaped)) {
        bioHtml = bioHtml.replace(escaped, `<strong class="phrase-bold">${escaped}</strong>`);
      }
    });
    statementEl.innerHTML = `<p class="statement-text">${bioHtml}</p>`;
  }

  if (factsEl) {
    const facts = [];
    if (profile.location) facts.push({ key: 'location', val: profile.location });
    if (education && education.length > 0) {
      facts.push({ key: 'education', val: `${education[0].degree.replace('in Computer Science & Engineering', 'CSE')}, ${education[0].years}` });
      if (education[0].score) {
        facts.push({ key: 'cgpa', val: education[0].score.replace('CGPA:', '').trim() });
      }
    }
    facts.push({ key: 'focus', val: 'Practical & scalable software' });

    factsEl.innerHTML = facts.map(f => `
      <div class="fact-row">
        <span class="fact-key">${escapeHTML(f.key)}</span>
        <span class="fact-val">${escapeHTML(f.val)}</span>
      </div>
    `).join('');
  }
}

/**
 * Render Grouped Skills (definition rows with group name left and tags right)
 */
function renderSkills(skills, containerOverride = null) {
  const container = containerOverride || document.getElementById('skills-grid');
  if (!container || !skills) return;

  const categoryLabels = {
    languages: 'Programming languages',
    webDev: 'Web and frameworks',
    databases: 'Databases and storage',
    toolsPlatforms: 'Tools and platforms',
    coreCS: 'Core computer science'
  };

  const rows = Object.entries(skills)
    .filter(([_, list]) => Array.isArray(list) && list.length > 0)
    .map(([key, list]) => {
      const title = categoryLabels[key] || formatKeyTitle(key);
      const tags = list.map(item => `<span class="skill-tag">${escapeHTML(item)}</span>`).join('');
      return `
        <div class="skills-row">
          <div class="skills-row-name"><h3>${escapeHTML(title)}</h3></div>
          <div class="skills-row-tags">${tags}</div>
        </div>
      `;
    }).join('');

  container.innerHTML = rows;
}

/**
 * Generates an accurate per-project terminal cover from the project's own data
 */
function generateProjectTerminalCover(project) {
  const slug = (project.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const techList = Array.isArray(project.tech) && project.tech.length > 0
    ? project.tech.slice(0, 4).join(', ')
    : 'Python, System';

  return `
    <div class="project-term-cover" aria-hidden="true">
      <div class="term-mini-header">
        <div class="terminal-dots">
          <span class="terminal-dot dot-red"></span>
          <span class="terminal-dot dot-yellow"></span>
          <span class="terminal-dot dot-green"></span>
        </div>
        <div class="term-mini-title">${escapeHTML(slug)}.sh</div>
        <div style="width: 36px;"></div>
      </div>
      <div class="term-mini-body">
        <div class="term-mini-line"><span class="cmd-prompt">$</span> run ${escapeHTML(slug)} --env=prod</div>
        <div class="term-mini-log">&gt; Stack: ${escapeHTML(techList)}</div>
        <div class="term-mini-log">&gt; Initialized successfully</div>
        <div class="term-mini-log term-mini-ok">&gt; [OK] active &amp; healthy</div>
      </div>
    </div>
  `;
}

/**
 * Render Projects
 * Featured project as full-width slab, other projects as two-column card grid
 */
function renderProjects(projects, containerOverride = null) {
  const container = containerOverride || document.getElementById('projects-grid');
  if (!container || !projects || projects.length === 0) return;

  const featuredProject = projects.find(p => p.featured) || projects[0];
  const otherProjects = projects.filter(p => p !== featuredProject);

  function renderActionButtons(p) {
    let actionsHtml = '';
    if (p.githubUrl) {
      actionsHtml += `
        <a href="${escapeHTML(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="btn-project" aria-label="Source code for ${escapeHTML(p.title)} (opens in a new tab)">
          ${window.Icons ? window.Icons.svg('github', { size: 15 }) : ''}
          Source code
        </a>
      `;
    }
    if (p.liveUrl) {
      actionsHtml += `
        <a href="${escapeHTML(p.liveUrl)}" target="_blank" rel="noopener noreferrer" class="btn-project" aria-label="Live demo for ${escapeHTML(p.title)} (opens in a new tab)">
          ${window.Icons ? window.Icons.svg('arrow-up-right', { size: 15 }) : ''}
          Live demo
        </a>
      `;
    }
    return actionsHtml;
  }

  function renderProjectCover(p) {
    // Prevent mismatched covers (e.g. SatQuery AI showing hyperlog cover)
    if (p.image && !p.image.includes('hyperlog') || (p.image && p.title.toLowerCase().includes('hyperlog'))) {
      return `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy">`;
    }
    return generateProjectTerminalCover(p);
  }

  const featuredHtml = featuredProject ? `
    <article class="featured-slab">
      <div class="featured-cover-wrap">
        <span class="featured-badge">Featured</span>
        ${renderProjectCover(featuredProject)}
      </div>
      <div class="featured-content">
        <h3 class="featured-title">${escapeHTML(featuredProject.title)}</h3>
        <p class="featured-desc">${escapeHTML(featuredProject.description)}</p>
        ${Array.isArray(featuredProject.tech) ? `<div class="project-tags">${featuredProject.tech.map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
        <div class="project-actions">
          ${renderActionButtons(featuredProject)}
        </div>
      </div>
    </article>
  ` : '';

  const otherHtml = otherProjects.length > 0 ? `
    <div class="projects-grid">
      ${otherProjects.map(p => `
        <article class="project-card">
          <div class="project-cover-wrap">
            ${renderProjectCover(p)}
          </div>
          <div class="project-card-content">
            <h3 class="project-title">${escapeHTML(p.title)}</h3>
            <p class="project-desc">${escapeHTML(p.description)}</p>
            ${Array.isArray(p.tech) ? `<div class="project-tags">${p.tech.map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('')}</div>` : ''}
            <div class="project-actions">
              ${renderActionButtons(p)}
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  ` : '';

  container.innerHTML = featuredHtml + otherHtml;
}

/**
 * Render Experience Timeline
 */
function renderExperience(experienceList, containerOverride = null) {
  const container = containerOverride || document.getElementById('experience-timeline');
  if (!container || !experienceList || experienceList.length === 0) return;

  container.innerHTML = experienceList.map(item => {
    const bullets = (item.description || '').split('\n').map(l => l.trim()).filter(Boolean);
    const bulletsHtml = bullets.length > 0 ? `
      <ul class="exp-bullets">
        ${bullets.map(b => `<li>${escapeHTML(b)}</li>`).join('')}
      </ul>
    ` : '';

    return `
      <div class="timeline-entry">
        <div class="timeline-node" aria-hidden="true"></div>
        <article class="timeline-card">
          <div class="timeline-top-row">
            <h3 class="timeline-title">${escapeHTML(item.role)}</h3>
            <span class="timeline-date-chip">${escapeHTML(item.duration)}</span>
          </div>
          <div class="timeline-org">${escapeHTML(item.org)}${item.location ? ` — ${escapeHTML(item.location)}` : ''}</div>
          ${bulletsHtml}
        </article>
      </div>
    `;
  }).join('');
}

/**
 * Render Education Timeline
 */
function renderEducation(educationList, containerOverride = null) {
  const container = containerOverride || document.getElementById('education-timeline');
  if (!container || !educationList || educationList.length === 0) return;

  container.innerHTML = educationList.map(item => `
    <div class="timeline-entry">
      <div class="timeline-node" aria-hidden="true"></div>
      <article class="timeline-card">
        <div class="timeline-top-row">
          <h3 class="timeline-title">${escapeHTML(item.degree)}</h3>
          <span class="timeline-date-chip">${escapeHTML(item.years)}</span>
        </div>
        <div class="timeline-org">${escapeHTML(item.institute)}</div>
        ${item.score ? `<div class="timeline-score-chip">${escapeHTML(item.score)}</div>` : ''}
        ${item.details ? `<p class="timeline-details">${escapeHTML(item.details)}</p>` : ''}
      </article>
    </div>
  `).join('');
}

/**
 * Render Combined Achievements & Certifications (white ledgers)
 */
function renderAchievementsAndCerts(achievements, certifications, achOverride = null, certOverride = null) {
  const achContainer = achOverride || document.getElementById('achievements-ledger');
  const certContainer = certOverride || document.getElementById('certifications-ledger');

  if (achContainer && Array.isArray(achievements)) {
    achContainer.innerHTML = achievements.map(a => `
      <div class="ledger-row">
        <div class="ledger-info">
          <div class="ledger-title">${escapeHTML(a.title)}</div>
          ${a.date ? `<div class="ledger-meta">${escapeHTML(a.date)}</div>` : ''}
        </div>
        ${a.link ? `
          <a href="${escapeHTML(a.link)}" target="_blank" rel="noopener noreferrer" class="btn-verify" aria-label="Verify ${escapeHTML(a.title)} (opens in a new tab)">
            Verify
            ${window.Icons ? window.Icons.svg('arrow-up-right', { size: 13 }) : ''}
          </a>
        ` : ''}
      </div>
    `).join('');
  }

  if (certContainer && Array.isArray(certifications)) {
    certContainer.innerHTML = certifications.map(c => `
      <div class="ledger-row">
        <div class="ledger-info">
          <div class="ledger-title">${escapeHTML(c.title)}</div>
          <div class="ledger-meta">${escapeHTML(c.issuer || '')}${c.date ? ` • ${escapeHTML(c.date)}` : ''}</div>
        </div>
        ${c.link ? `
          <a href="${escapeHTML(c.link)}" target="_blank" rel="noopener noreferrer" class="btn-verify" aria-label="Verify certification for ${escapeHTML(c.title)} (opens in a new tab)">
            Verify
            ${window.Icons ? window.Icons.svg('arrow-up-right', { size: 13 }) : ''}
          </a>
        ` : ''}
      </div>
    `).join('');
  }
}

/**
 * Render Coding Profiles Stats Cards
 */
function renderCodingProfiles(profiles, containerOverride = null) {
  const container = containerOverride || document.getElementById('coding-profiles-grid');
  if (!container || !profiles || profiles.length === 0) return;

  container.innerHTML = profiles.map(p => {
    let cleanStats = (p.stats || '').replace(/\.$/, '');
    if (cleanStats.toLowerCase().includes('institute rank')) {
      cleanStats = cleanStats.replace('•', ',').toLowerCase();
    }

    return `
      <a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="profile-tile" aria-label="${escapeHTML(p.platform)} profile (opens in a new tab)">
        <div class="profile-tile-header">
          <h3 class="profile-tile-platform">${escapeHTML(p.platform)}</h3>
          ${window.Icons ? window.Icons.svg('arrow-up-right', { size: 16 }) : ''}
        </div>
        <div class="profile-tile-handle">@${escapeHTML(p.handle)}</div>
        <div class="profile-tile-stat">${escapeHTML(cleanStats)}</div>
      </a>
    `;
  }).join('');
}

/**
 * Render Extracurricular & Leadership
 */
function renderExtracurricular(list, containerOverride = null) {
  const container = containerOverride || document.getElementById('extracurricular-list');
  if (!container || !list || list.length === 0) return;

  container.innerHTML = list.map(item => {
    const lines = (item.description || '').split('\n').map(l => l.trim()).filter(Boolean);
    const descHtml = lines.length > 1
      ? `<ul class="exp-bullets">${lines.map(l => `<li>${escapeHTML(l)}</li>`).join('')}</ul>`
      : `<p class="activity-desc">${escapeHTML(item.description)}</p>`;

    return `
      <article class="activity-card">
        <div class="activity-header-row">
          <h3 class="activity-title">${escapeHTML(item.title)}</h3>
          ${item.duration ? `<span class="timeline-date-chip">${escapeHTML(item.duration)}</span>` : ''}
        </div>
        ${descHtml}
      </article>
    `;
  }).join('');
}

/**
 * Render News Timeline / Changelog Ledger
 */
function renderNews(newsList, containerOverride = null) {
  const container = containerOverride || document.getElementById('news-ledger');
  const expandWrap = containerOverride ? null : document.getElementById('news-expand-wrap');
  const expandBtn = containerOverride ? null : document.getElementById('btn-news-expand');
  if (!container || !newsList || newsList.length === 0) return;

  let showAll = false;

  function renderRows() {
    const visibleItems = showAll ? newsList : newsList.slice(0, 6);
    container.innerHTML = visibleItems.map(item => `
      <div class="news-ledger-row">
        <span class="news-date">${escapeHTML(item.date)}</span>
        <span class="news-message">${escapeHTML(item.text)}</span>
      </div>
    `).join('');

    if (newsList.length > 6) {
      if (expandWrap) expandWrap.style.display = 'block';
      if (expandBtn) {
        expandBtn.textContent = showAll ? 'Show fewer updates' : `Show older updates (${newsList.length - 6} more)`;
      }
    } else if (expandWrap) {
      expandWrap.style.display = 'none';
    }
  }

  if (expandBtn) {
    expandBtn.onclick = () => {
      showAll = !showAll;
      renderRows();
    };
  }

  renderRows();
}

/**
 * Render Structured Full-Width Footer
 */
function renderFooter(profile) {
  if (!profile) return;

  const nameEl = document.getElementById('footer-name');
  if (nameEl && profile.name) nameEl.textContent = profile.name;

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // CTA statement: if starts with "Open to ", split light & bold; else all bold
  const ctaTitle = document.getElementById('footer-cta-title');
  if (ctaTitle && profile.status) {
    const raw = profile.status;
    let lightPart = '';
    let boldPart = raw;
    if (raw.toLowerCase().startsWith('open to')) {
      lightPart = 'Open to';
      boldPart = raw.substring(7).trim();
    }
    ctaTitle.innerHTML = `
      ${lightPart ? `<span class="footer-cta__light">${escapeHTML(lightPart)}</span>` : ''}
      <strong class="footer-cta__bold">${escapeHTML(boldPart)}</strong>
    `;
  }

  // Footer status bottom
  const footerStatusText = document.getElementById('footer-status-text');
  if (footerStatusText && profile.status) {
    footerStatusText.textContent = profile.status;
  }

  // Location
  const locText = document.getElementById('footer-loc-text');
  if (locText && profile.location) {
    locText.textContent = profile.location;
  }

  // Email link & buttons
  const emailObj = (profile.socials || []).find(s => s.platform.toLowerCase().includes('mail') || (s.url && s.url.includes('@')));
  const emailAddress = emailObj ? emailObj.url.replace(/^mailto:/, '') : 'barun20.saha@gmail.com';
  const mailto = 'mailto:' + emailAddress;

  const emailBtn = document.getElementById('footer-email-btn');
  if (emailBtn) emailBtn.href = mailto;

  const emailLink = document.getElementById('footer-email');
  if (emailLink) {
    emailLink.href = mailto;
    emailLink.textContent = emailAddress;
  }

  const copyBtn = document.getElementById('copy-email');
  if (copyBtn) copyBtn.dataset.email = emailAddress;

  // Resume buttons
  const resumeBtn = document.getElementById('footer-resume-btn');
  if (resumeBtn && profile.resumeUrl) resumeBtn.href = profile.resumeUrl;

  const sitemapResume = document.getElementById('footer-sitemap-resume');
  if (sitemapResume && profile.resumeUrl) sitemapResume.href = profile.resumeUrl;

  // Social rows
  const socialList = document.getElementById('footer-socials-list');
  if (socialList && Array.isArray(profile.socials)) {
    const onlineSocials = profile.socials.filter(s => !s.platform.toLowerCase().includes('mail'));
    socialList.innerHTML = onlineSocials.map(s => {
      let handle = s.username ? (s.username.startsWith('@') ? s.username : '@' + s.username) : '';
      if (!handle && s.url) {
        try {
          const path = new URL(s.url).pathname.replace(/^\/|\/$/g, '');
          handle = path ? '/' + path : '';
        } catch (e) {}
      }
      return `
        <li><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">
          ${window.Icons ? window.Icons.svg(window.Icons.forUrl(s.url), { size: 20 }) : ''}
          <span class="footer-social__name">${escapeHTML(s.platform)}</span>
          <span class="footer-social__handle">${escapeHTML(handle)}</span>
          ${window.Icons ? window.Icons.svg('arrow-up-right', { size: 16 }) : ''}
        </a></li>
      `;
    }).join('');
  }

  // Footer behavior (copy email, local time, back to top)
  initFooterBehavior(profile);
}

function initFooterBehavior(profile) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // local time in owner's timezone (data-tz, default Asia/Kolkata)
  const t = document.getElementById('local-time');
  if (t) {
    const tz = (profile && profile.timezone) || t.dataset.tz || 'Asia/Kolkata';
    t.dataset.tz = tz;
    const city = (tz.split('/')[1] || '').replace(/_/g, ' ');
    const fmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz, timeZoneName: 'short' });
    const tick = () => {
      const d = new Date();
      t.textContent = fmt.format(d) + (city ? ' in ' + city : '');
      t.dateTime = d.toISOString();
    };
    tick();
    setInterval(tick, 30000);
  }

  // copy email
  const copy = document.getElementById('copy-email');
  if (copy && !copy.dataset.bound) {
    copy.dataset.bound = 'true';
    const label = copy.querySelector('span');
    copy.addEventListener('click', async () => {
      const email = copy.dataset.email || 'barun20.saha@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
        label.textContent = 'Copied';
        if (window.Icons) {
          const svgEl = copy.querySelector('svg');
          if (svgEl) svgEl.outerHTML = window.Icons.svg('check', { size: 16 });
        }
      } catch {
        const a = document.getElementById('footer-email');
        if (a) {
          const r = document.createRange(); r.selectNodeContents(a);
          const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        }
        label.textContent = 'Press Ctrl or Cmd + C';
      }
      setTimeout(() => {
        label.textContent = 'Copy email';
        if (window.Icons) {
          const svgEl = copy.querySelector('svg');
          if (svgEl) svgEl.outerHTML = window.Icons.svg('copy', { size: 16 });
        }
      }, 2000);
    });
  }

  // back to top
  const topBtn = document.getElementById('back-to-top');
  if (topBtn && !topBtn.dataset.bound) {
    topBtn.dataset.bound = 'true';
    topBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      const topTarget = document.getElementById('top') || document.getElementById('hero');
      if (topTarget) {
        topTarget.setAttribute('tabindex', '-1');
        topTarget.focus({ preventScroll: true });
      }
    });
  }
}

/**
 * Theme Toggle Handler
 */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const sunSpan = toggleBtn.querySelector('.theme-toggle__sun');
  const moonSpan = toggleBtn.querySelector('.theme-toggle__moon');
  if (sunSpan && window.Icons) sunSpan.innerHTML = window.Icons.svg('sun', { size: 20 });
  if (moonSpan && window.Icons) moonSpan.innerHTML = window.Icons.svg('moon', { size: 20 });

  const getTheme = () => document.documentElement.getAttribute('data-theme') || 'light';

  const updateAria = (theme) => {
    toggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  updateAria(getTheme());

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    updateAria(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#0F1218' : '#FFFAE7');
    }
  };

  toggleBtn.addEventListener('click', () => {
    const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

/**
 * Full-width Header Scroll Progress, Scroll Spy & Mobile Menu
 */
function setupHeaderAndMobileNav(profile) {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const bar = header.querySelector('.scroll-progress span');
  const toggle = header.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const root = document.documentElement;

  if (profile) {
    const headerResume = document.getElementById('header-resume-btn');
    if (headerResume && profile.resumeUrl) {
      headerResume.href = profile.resumeUrl;
      headerResume.innerHTML = (window.Icons ? window.Icons.svg('file-text', { size: 16 }) : '') + '<span>View resume</span>';
    }
    const mobileResume = document.getElementById('mobile-menu-resume-btn');
    if (mobileResume && profile.resumeUrl) {
      mobileResume.href = profile.resumeUrl;
    }
    const mobileEmail = document.getElementById('mobile-menu-email');
    if (mobileEmail) {
      const mail = (profile.socials || []).find(s => s.platform.toLowerCase().includes('mail') || (s.url && s.url.includes('@')));
      if (mail) {
        const addr = mail.url.replace(/^mailto:/, '');
        mobileEmail.href = 'mailto:' + addr;
        mobileEmail.textContent = addr;
      }
    }
    const mobileSocials = document.getElementById('mobile-menu-socials');
    if (mobileSocials && Array.isArray(profile.socials)) {
      mobileSocials.innerHTML = profile.socials
        .filter(s => !s.platform.toLowerCase().includes('mail'))
        .map(s => {
          let href = s.url || '';
          return `
            <a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer" class="icon-btn" aria-label="${escapeHTML(s.platform)} (opens in a new tab)">
              ${window.Icons ? window.Icons.svg(window.Icons.forUrl(href), { size: 20 }) : ''}
            </a>
          `;
        }).join('');
    }
  }

  // 1. scrolled state + progress (one rAF-throttled handler)
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header.dataset.scrolled = String(y > 8);
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // 2. scroll-spy: no item is active while the hero is on screen
  const links = [...document.querySelectorAll('.nav a[href^="#"], .mobile-menu a[href^="#"]')];
  const setActive = (id) => links.forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('is-active', on);
    on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id], #top, #hero').forEach(s => io.observe(s));

  // 3. mobile menu
  if (!toggle || !menu) return;
  const focusables = () => [...menu.querySelectorAll('a[href], button')];
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    root.classList.toggle('menu-open', open);
    toggle.innerHTML = window.Icons ? window.Icons.svg(open ? 'x' : 'menu') : '';
    if (open) focusables()[0]?.focus(); else toggle.focus({ preventScroll: true });
  };
  menu.inert = true;
  toggle.innerHTML = window.Icons ? window.Icons.svg('menu') : '';
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  if (new URLSearchParams(window.location.search).get('menu') === 'open') {
    setTimeout(() => setMenu(true), 350);
  }
  menu.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key === 'Tab') {
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); toggle.focus(); }
      else if (!e.shiftKey && document.activeElement === toggle) { e.preventDefault(); first.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); toggle.focus(); }
    }
  });
  matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });
}

/**
 * Helper: Escapes HTML to prevent XSS
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper: Converts camelCase / key to Human Title
 */
function formatKeyTitle(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * SVG Icons for Social Platforms
 */
function getSocialIconSvg(platform, url) {
  if (window.Icons) {
    if (url) return window.Icons.svg(window.Icons.forUrl(url), { size: 20 });
    const p = (platform || '').toLowerCase();
    if (p.includes('github')) return window.Icons.svg('github', { size: 20 });
    if (p.includes('linkedin')) return window.Icons.svg('linkedin', { size: 20 });
    if (p.includes('leetcode')) return window.Icons.svg('leetcode', { size: 20 });
    if (p.includes('geeks')) return window.Icons.svg('geeksforgeeks', { size: 20 });
    if (p.includes('codeforces')) return window.Icons.svg('codeforces', { size: 20 });
    if (p.includes('mail') || p.includes('email')) return window.Icons.svg('mail', { size: 20 });
    return window.Icons.svg('link', { size: 20 });
  }
  const p = (platform || '').toLowerCase();
  if (p.includes('github')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`;
  }
  if (p.includes('linkedin')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`;
  }
  if (p.includes('leetcode')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .271 3.542 5.29 5.29 0 0 0 2.004 2.484l.293.182v.002l4.882 3.046c.866.54 1.95.422 2.68-.285l4.907-4.74a1.374 1.374 0 0 0-.95-2.338H9.378a.376.376 0 0 1-.266-.642l3.418-3.486c.362-.369.362-.968 0-1.337l-3.418-3.486a.376.376 0 0 1 .266-.642h7.625c.758 0 1.372-.614 1.372-1.372V2.836A1.374 1.374 0 0 0 16.994 1.4L13.483 0z"/></svg>`;
  }
  if (p.includes('codeforces')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-3 0V9a1.5 1.5 0 0 1 1.5-1.5zm7.5-4.5a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-3 0V4.5A1.5 1.5 0 0 1 12 3zm7.5 7.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-3 0V12a1.5 1.5 0 0 1 1.5-1.5z"/></svg>`;
  }
  if (p.includes('email') || p.includes('mail')) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
  }
  // Default link icon
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
}
