/**
 * Portfolio Main JavaScript
 * Dynamic client-side rendering from data/portfolio.json
 * Dependency-free, vanilla ES6+
 */

document.addEventListener('DOMContentLoaded', () => {
  initPortfolio();
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
    setupNavScrollSpy();
    setupMobileNav();

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
 */
function initTerminalTyper(data) {
  const terminalEl = document.getElementById('terminal-content');
  if (!terminalEl) return;

  const profile = data.profile || {};
  const skills = data.skills || {};
  const langStr = Array.isArray(skills.languages) ? skills.languages.join(', ') : 'C++, Python, Go, TypeScript';
  const interests = 'Distributed Systems, High-Performance Web, Compilers & DSA';

  const terminalLines = [
    { type: 'cmd', text: 'whoami' },
    { type: 'output', text: `${profile.name || 'Barun Saha'} — ${profile.tagline || 'B.Tech CSE Student'}` },
    { type: 'cmd', text: 'cat core_stack.txt' },
    { type: 'output', text: `Languages: ${langStr}` },
    { type: 'cmd', text: 'cat interests.txt' },
    { type: 'output', text: interests },
    { type: 'cmd', text: 'curl -s https://status.local' },
    { type: 'output', text: `[ONLINE] ${profile.status || 'Ready for impact'}` }
  ];

  // Check if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Render static output immediately
    terminalEl.innerHTML = terminalLines.map(line => {
      if (line.type === 'cmd') {
        return `<div class="cmd-line"><span class="cmd-prompt">$</span>${escapeHTML(line.text)}</div>`;
      } else {
        return `<div class="cmd-output">> ${escapeHTML(line.text)}</div>`;
      }
    }).join('') + '<div class="cmd-line"><span class="cmd-prompt">$</span><span class="cursor-blink"></span></div>';
    return;
  }

  // Interactive typing animation sequence
  terminalEl.innerHTML = '';
  let lineIdx = 0;
  let charIdx = 0;
  let currentCmdContainer = null;

  function typeNext() {
    if (lineIdx >= terminalLines.length) {
      // Finished all lines, append final static prompt
      const finalPrompt = document.createElement('div');
      finalPrompt.className = 'cmd-line';
      finalPrompt.innerHTML = `<span class="cmd-prompt">$</span><span class="cursor-blink"></span>`;
      terminalEl.appendChild(finalPrompt);
      return;
    }

    const item = terminalLines[lineIdx];

    if (item.type === 'cmd') {
      if (charIdx === 0) {
        currentCmdContainer = document.createElement('div');
        currentCmdContainer.className = 'cmd-line';
        currentCmdContainer.innerHTML = `<span class="cmd-prompt">$</span><span class="cmd-text"></span><span class="cursor-blink"></span>`;
        terminalEl.appendChild(currentCmdContainer);
      }

      const textEl = currentCmdContainer.querySelector('.cmd-text');
      if (charIdx < item.text.length) {
        textEl.textContent += item.text.charAt(charIdx);
        charIdx++;
        setTimeout(typeNext, 28 + Math.random() * 25);
      } else {
        // Command finished typing, remove cursor from this line
        const cursor = currentCmdContainer.querySelector('.cursor-blink');
        if (cursor) cursor.remove();
        charIdx = 0;
        lineIdx++;
        setTimeout(typeNext, 180);
      }
    } else if (item.type === 'output') {
      const outputDiv = document.createElement('div');
      outputDiv.className = 'cmd-output';
      outputDiv.textContent = `> ${item.text}`;
      terminalEl.appendChild(outputDiv);
      lineIdx++;
      setTimeout(typeNext, 120);
    }
  }

  // Start typing shortly after page load
  setTimeout(typeNext, 250);
}

/**
 * Render Hero Profile Action Card
 */
function renderHeroProfile(profile) {
  if (!profile) return;

  const avatar = document.getElementById('hero-avatar');
  if (avatar && profile.photo) {
    avatar.src = profile.photo;
    avatar.alt = profile.name || 'Barun Saha';
  }

  const nameEl = document.getElementById('hero-name');
  if (nameEl && profile.name) {
    nameEl.textContent = profile.name;
  }

  const statusEl = document.getElementById('hero-status');
  if (statusEl && profile.status) {
    statusEl.textContent = profile.status;
  }

  const resumeBtn = document.getElementById('hero-resume-btn');
  if (resumeBtn && profile.resumeUrl) {
    resumeBtn.href = profile.resumeUrl;
  } else if (resumeBtn) {
    resumeBtn.style.display = 'none';
  }

  const socialsContainer = document.getElementById('hero-socials');
  if (socialsContainer && Array.isArray(profile.socials)) {
    socialsContainer.innerHTML = profile.socials.map(s => {
      const iconSvg = getSocialIconSvg(s.platform);
      return `
        <a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="${escapeHTML(s.platform)}" aria-label="${escapeHTML(s.platform)}">
          ${iconSvg}
        </a>
      `;
    }).join('');
  }
}

/**
 * Render About section & Quick facts
 */
function renderAbout(profile, education) {
  const section = document.getElementById('about-section');
  if (!profile && (!education || education.length === 0)) {
    if (section) section.style.display = 'none';
    return;
  }

  const bioEl = document.getElementById('about-bio-text');
  if (bioEl && profile && profile.bio) {
    bioEl.textContent = profile.bio;
  }

  const factsContainer = document.getElementById('quick-facts-list');
  if (factsContainer) {
    const facts = [];
    if (profile?.location) facts.push({ label: 'Location', value: profile.location });
    if (education && education.length > 0) {
      facts.push({ label: 'Current Education', value: `${education[0].degree} (${education[0].years})` });
      if (education[0].score) facts.push({ label: 'Academic Standing', value: education[0].score });
    }
    if (profile?.tagline) facts.push({ label: 'Primary Focus', value: profile.tagline });

    factsContainer.innerHTML = facts.map(f => `
      <li class="quick-fact-item">
        <span class="quick-fact-label">${escapeHTML(f.label)}</span>
        <span class="quick-fact-value">${escapeHTML(f.value)}</span>
      </li>
    `).join('');
  }
}

/**
 * Render Education Timeline
 */
function renderEducation(educationList) {
  const section = document.getElementById('education-section');
  const container = document.getElementById('education-timeline');

  if (!educationList || educationList.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = educationList.map(item => `
    <div class="timeline-item">
      <div class="timeline-marker" aria-hidden="true"></div>
      <div class="timeline-card">
        <div class="timeline-header-row">
          <h3 class="timeline-title">${escapeHTML(item.degree)}</h3>
          <span class="timeline-badge">${escapeHTML(item.years)}</span>
        </div>
        <div class="timeline-subtitle">${escapeHTML(item.institute)}</div>
        ${item.score ? `<div class="timeline-score">${escapeHTML(item.score)}</div>` : ''}
        ${item.details ? `<p class="timeline-desc">${escapeHTML(item.details)}</p>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Render Grouped Skills Clusters
 */
function renderSkills(skills) {
  const section = document.getElementById('skills-section');
  const container = document.getElementById('skills-grid');

  if (!skills || Object.keys(skills).length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  const categoryLabels = {
    languages: 'Programming Languages',
    webDev: 'Web & Frameworks',
    databases: 'Databases & Storage',
    toolsPlatforms: 'Tools & Platforms',
    coreCS: 'Core Computer Science'
  };

  const clustersHtml = Object.entries(skills)
    .filter(([_, list]) => Array.isArray(list) && list.length > 0)
    .map(([key, list]) => {
      const title = categoryLabels[key] || formatKeyTitle(key);
      const chipsHtml = list.map(skill => `<span class="skill-chip">${escapeHTML(skill)}</span>`).join('');
      return `
        <div class="skill-cluster-card">
          <h3 class="skill-cluster-title">${escapeHTML(title)}</h3>
          <div class="skill-chips">
            ${chipsHtml}
          </div>
        </div>
      `;
    }).join('');

  if (clustersHtml) {
    container.innerHTML = clustersHtml;
  } else if (section) {
    section.style.display = 'none';
  }
}

/**
 * Render Projects Grid
 */
function renderProjects(projects) {
  const section = document.getElementById('projects-section');
  const container = document.getElementById('projects-grid');

  if (!projects || projects.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = projects.map(p => {
    const techTags = Array.isArray(p.tech) ? p.tech.map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('') : '';
    const featuredClass = p.featured ? 'is-featured' : '';
    const featuredBadge = p.featured ? '<span class="featured-badge">Featured</span>' : '';
    const imageSrc = p.image || 'assets/img/projects/hyperlog.svg';

    let linksHtml = '';
    if (p.githubUrl) {
      linksHtml += `
        <a href="${escapeHTML(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Source Code
        </a>
      `;
    }
    if (p.liveUrl) {
      linksHtml += `
        <a href="${escapeHTML(p.liveUrl)}" target="_blank" rel="noopener noreferrer" class="project-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Live Demo
        </a>
      `;
    }

    return `
      <article class="project-card ${featuredClass}">
        <div class="project-image-wrapper">
          ${featuredBadge}
          <img src="${escapeHTML(imageSrc)}" alt="${escapeHTML(p.title)}" loading="lazy">
        </div>
        <div class="project-content">
          <h3 class="project-title">${escapeHTML(p.title)}</h3>
          <p class="project-desc">${escapeHTML(p.description)}</p>
          ${techTags ? `<div class="project-tech-tags">${techTags}</div>` : ''}
          ${linksHtml ? `<div class="project-links">${linksHtml}</div>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Render Experience Timeline
 */
function renderExperience(experienceList) {
  const section = document.getElementById('experience-section');
  const container = document.getElementById('experience-timeline');

  if (!experienceList || experienceList.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = experienceList.map(item => `
    <div class="timeline-item">
      <div class="timeline-marker" aria-hidden="true"></div>
      <div class="timeline-card">
        <div class="timeline-header-row">
          <h3 class="timeline-title">${escapeHTML(item.role)}</h3>
          <span class="timeline-badge">${escapeHTML(item.duration)}</span>
        </div>
        <div class="timeline-subtitle">${escapeHTML(item.org)}${item.location ? ` • ${escapeHTML(item.location)}` : ''}</div>
        <p class="timeline-desc">${escapeHTML(item.description)}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Render Combined Achievements & Certifications
 */
function renderAchievementsAndCerts(achievements, certifications) {
  const section = document.getElementById('achievements-section');
  const achContainer = document.getElementById('achievements-list');
  const certContainer = document.getElementById('certifications-list');

  const hasAch = Array.isArray(achievements) && achievements.length > 0;
  const hasCert = Array.isArray(certifications) && certifications.length > 0;

  if (!hasAch && !hasCert) {
    if (section) section.style.display = 'none';
    return;
  }

  if (hasAch && achContainer) {
    achContainer.innerHTML = achievements.map(a => `
      <div class="cred-card">
        <div>
          <h4 class="cred-title">${escapeHTML(a.title)}</h4>
          ${a.date ? `<div class="cred-meta">${escapeHTML(a.date)}</div>` : ''}
        </div>
        ${a.link ? `<a href="${escapeHTML(a.link)}" target="_blank" rel="noopener noreferrer" class="cred-link">Verify ↗</a>` : ''}
      </div>
    `).join('');
  } else if (achContainer) {
    achContainer.parentElement.style.display = 'none';
  }

  if (hasCert && certContainer) {
    certContainer.innerHTML = certifications.map(c => `
      <div class="cred-card">
        <div>
          <h4 class="cred-title">${escapeHTML(c.title)}</h4>
          <div class="cred-meta">${escapeHTML(c.issuer || '')}${c.date ? ` • ${escapeHTML(c.date)}` : ''}</div>
        </div>
        ${c.link ? `<a href="${escapeHTML(c.link)}" target="_blank" rel="noopener noreferrer" class="cred-link">Verify ↗</a>` : ''}
      </div>
    `).join('');
  } else if (certContainer) {
    certContainer.parentElement.style.display = 'none';
  }
}

/**
 * Render Coding Profiles Stats Cards
 */
function renderCodingProfiles(profiles) {
  const section = document.getElementById('coding-profiles-section');
  const container = document.getElementById('coding-profiles-grid');

  if (!profiles || profiles.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = profiles.map(p => `
    <a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="profile-stat-card">
      <div class="profile-card-top">
        <span class="profile-platform-name">${escapeHTML(p.platform)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </div>
      <div class="profile-handle">@${escapeHTML(p.handle)}</div>
      <div class="profile-stat-highlight">${escapeHTML(p.stats)}</div>
    </a>
  `).join('');
}

/**
 * Render Extracurricular & Leadership
 */
function renderExtracurricular(list) {
  const section = document.getElementById('extracurricular-section');
  const container = document.getElementById('extracurricular-list');

  if (!list || list.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="cred-card" style="margin-bottom: 12px;">
      <div>
        <h4 class="cred-title">${escapeHTML(item.title)}</h4>
        <div class="cred-meta">${escapeHTML(item.duration || '')}</div>
        <p class="timeline-desc" style="margin-top: 8px;">${escapeHTML(item.description)}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Render News Timeline
 */
function renderNews(newsList) {
  const section = document.getElementById('news-section');
  const container = document.getElementById('news-list');

  if (!newsList || newsList.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  container.innerHTML = newsList.map(item => `
    <div class="news-item">
      <span class="news-date">${escapeHTML(item.date)}</span>
      <span class="news-text">${escapeHTML(item.text)}</span>
    </div>
  `).join('');
}

/**
 * Render Footer
 */
function renderFooter(profile) {
  const nameEl = document.getElementById('footer-name');
  if (nameEl && profile?.name) {
    nameEl.textContent = profile.name;
  }

  const copyEl = document.getElementById('footer-copyright-year');
  if (copyEl) {
    copyEl.textContent = new Date().getFullYear();
  }

  const socialsContainer = document.getElementById('footer-socials');
  if (socialsContainer && Array.isArray(profile?.socials)) {
    socialsContainer.innerHTML = profile.socials.map(s => {
      const iconSvg = getSocialIconSvg(s.platform);
      return `
        <a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="${escapeHTML(s.platform)}" aria-label="${escapeHTML(s.platform)}">
          ${iconSvg}
        </a>
      `;
    }).join('');
  }
}

/**
 * Navigation Scroll Spy & Smooth Link Handling
 */
function setupNavScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const sections = [];

  navLinks.forEach(link => {
    const id = link.getAttribute('href').substring(1);
    const sec = document.getElementById(id);
    if (sec) sections.push({ id, element: sec, link });
  });

  const onScroll = () => {
    const scrollPos = window.scrollY + 120;
    for (let i = sections.length - 1; i >= 0; i--) {
      const { element, link } = sections[i];
      if (element.offsetTop <= scrollPos) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        break;
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

/**
 * Mobile Navigation Toggle
 */
function setupMobileNav() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
    const isOpen = navLinks.classList.contains('is-open');
    toggleBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close nav on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
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
function getSocialIconSvg(platform) {
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
