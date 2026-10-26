/* ═══════════════════════════════════════════════════════════════
   BrainzBytes — Global Navigation + Theme + Scroll Animations
   ═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── Theme Toggle ──────────────────────────────────────────
  var THEMES = ['midnight', 'light', 'neon'];
  var ICONS = { midnight: '🌙', light: '☀️', neon: '⚡' };
  var saved = localStorage.getItem('bb_theme');
  var current = THEMES.indexOf(saved) >= 0 ? saved : 'midnight';
  document.documentElement.setAttribute('data-theme', current);

  function setTheme(t) {
    current = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('bb_theme', t);
    document.querySelectorAll('.theme-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.theme === t);
    });
  }

  // ── Site Map & Navigation Data ────────────────────────────
  var BASE = (function() {
    var p = location.pathname;
    if (p.indexOf('/docs/documents/') >= 0
        || p.indexOf('/docs/features/') >= 0
        || p.indexOf('/docs/diagram-viewer/') >= 0) return '../../';
    if (p.indexOf('/contextweaver/') >= 0) return '../';
    if (p.indexOf('/docs/') >= 0) return '../';
    return '';
  })();

  var NAV_SECTIONS = [
    { label: 'ContextWeaver', href: BASE + 'contextweaver/index.html', icon: '🧠',
      children: [
        { label: 'Platform overview', href: BASE + 'contextweaver/index.html' },
        { label: 'Why ContextWeaver', href: BASE + 'index.html#why' },
        { label: 'Governed lifecycle', href: BASE + 'index.html#contextweaver' },
        { label: 'Product experience', href: BASE + 'index.html#product' },
        { label: 'Roles and outcomes', href: BASE + 'index.html#roles' }
      ]
    },
    { label: 'Architecture', href: BASE + 'docs/documents/azure-production-platform-and-poc.html', icon: '🏗️',
      children: [
        { label: 'NextGen platform overview', href: BASE + 'docs/documents/azure-production-platform-and-poc.html' },
        { label: 'Durable execution', href: BASE + 'docs/documents/durable-asynchronous-execution.html' },
        { label: 'Cloud-neutral delivery', href: BASE + 'docs/documents/cloud-neutral-infrastructure.html' },
        { label: 'Source and state structure', href: BASE + 'docs/documents/source-code-structure.html' },
        { label: 'Optional diagram library', href: BASE + 'docs/diagram-viewer/contextweaver-nextgen-architecture.html' }
      ]
    },
    { label: 'Platform guides', href: BASE + 'docs/index.html', icon: '🎯',
      children: [
        { label: 'Documentation by role', href: BASE + 'docs/index.html#audiences' },
        { label: 'Services and Workflows', href: BASE + 'contextweaver/index.html' },
        { label: 'Dynamic Agents and MCPs', href: BASE + 'docs/documents/dynamic-agent-mcp-lifecycle.html' },
        { label: 'Governed RAG', href: BASE + 'docs/documents/governed-rag-ingestion.html' },
        { label: 'Operations and SRE', href: BASE + 'docs/documents/observability-standard.html' }
      ]
    },
    { label: 'Trust', href: BASE + 'docs/documents/continuous-entitlement-enforcement.html', icon: '🔐',
      children: [
        { label: 'Trust and deployment', href: BASE + 'index.html#trust' },
        { label: 'Continuous authorization', href: BASE + 'docs/documents/continuous-entitlement-enforcement.html' },
        { label: 'Credential isolation', href: BASE + 'docs/documents/credential-non-possession.html' },
        { label: 'Agent sandbox security', href: BASE + 'docs/documents/agent-sandbox-security.html' },
        { label: 'Implementation readiness', href: BASE + 'docs/documents/implementation-readiness.html' }
      ]
    },
    { label: 'Resources', href: BASE + 'docs/index.html', icon: '📚',
      children: [
        { label: 'Documentation', href: BASE + 'docs/index.html' },
        { label: 'Technical library', href: BASE + 'docs/index.html#library' },
        { label: 'Product brochure', href: BASE + 'docs/features/contextweaver-product-brochure.html' },
        { label: 'NextGen whitepaper', href: BASE + 'docs/documents/spec-driven-ai-platform-whitepaper.html' },
        { label: 'Diagram library', href: BASE + 'docs/diagram-viewer/contextweaver-nextgen-architecture.html' }
      ]
    },
    { label: 'Launch app ↗', href: 'https://app.brainzbytes.com', icon: '↗' }
  ];

  // Ordered page list for prev/next navigation
  var PAGE_ORDER = [
    { href: 'index.html', title: 'Home' },
    { href: 'contextweaver/index.html', title: 'Product Overview' },
    { href: 'docs/index.html', title: 'Documentation' }
  ];

  function getCurrentPageIndex() {
    var p = location.pathname.replace(/^\/+/, '');
    if (p === '' || p.endsWith('/')) p += 'index.html';
    for (var i = 0; i < PAGE_ORDER.length; i++) {
      if (p === PAGE_ORDER[i].href) {
        return i;
      }
    }
    return -1;
  }

  function isActivePage(href) {
    var current = new URL(location.href);
    var target = new URL(href, current);
    function normalize(path) {
      path = path.replace(/^\/+/, '');
      return path === '' || path.endsWith('/') ? path + 'index.html' : path;
    }
    return normalize(current.pathname) === normalize(target.pathname);
  }

  function isSectionActive(section) {
    if (isActivePage(section.href)) return true;
    if (section.children) {
      for (var i = 0; i < section.children.length; i++) {
        if (isActivePage(section.children[i].href)) return true;
      }
    }
    return false;
  }

  function getActiveSectionLabel() {
    var i;
    for (i = 0; i < NAV_SECTIONS.length; i++) {
      if (isActivePage(NAV_SECTIONS[i].href)) return NAV_SECTIONS[i].label;
    }
    for (i = 0; i < NAV_SECTIONS.length; i++) {
      var children = NAV_SECTIONS[i].children || [];
      for (var j = 0; j < children.length; j++) {
        if (isActivePage(children[j].href)) return NAV_SECTIONS[i].label;
      }
    }
    return '';
  }

  // ── Build Navigation Bar ──────────────────────────────────
  function buildNav() {
    var activeSectionLabel = getActiveSectionLabel();
    var nav = document.createElement('nav');
    nav.id = 'bb-global-nav';
    nav.innerHTML = '<div class="bb-nav-inner">'
      + '<a href="' + BASE + 'index.html" class="bb-nav-brand">'
      + '<img src="' + BASE + 'logo.svg" alt="BrainzBytes" class="bb-nav-logo">'
      + '<span>BrainzBytes</span></a>'
      + '<button class="bb-nav-hamburger" aria-label="Toggle menu">☰</button>'
      + '<div class="bb-nav-links"></div>'
      + '<div class="bb-nav-theme"></div>'
      + '</div>';

    var linksContainer = nav.querySelector('.bb-nav-links');
    NAV_SECTIONS.forEach(function(section) {
      var item = document.createElement('div');
      item.className = 'bb-nav-item' + (section.label === activeSectionLabel ? ' active' : '');

      var link = document.createElement('a');
      link.href = section.href;
      link.textContent = section.label;
      link.className = 'bb-nav-link';
      item.appendChild(link);

      if (section.children) {
        item.classList.add('has-dropdown');
        var dd = document.createElement('div');
        dd.className = 'bb-nav-dropdown';
        section.children.forEach(function(child) {
          var a = document.createElement('a');
          a.href = child.href;
          a.textContent = child.label;
          a.className = 'bb-nav-dd-link' + (isActivePage(child.href) ? ' active' : '');
          dd.appendChild(a);
        });
        item.appendChild(dd);
      }
      linksContainer.appendChild(item);
    });

    // Theme toggle in nav
    var themeContainer = nav.querySelector('.bb-nav-theme');
    THEMES.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'theme-btn' + (t === current ? ' active' : '');
      btn.dataset.theme = t;
      btn.innerHTML = ICONS[t];
      btn.title = t.charAt(0).toUpperCase() + t.slice(1) + ' theme';
      btn.addEventListener('click', function() { setTheme(t); });
      themeContainer.appendChild(btn);
    });

    // Hamburger toggle for mobile
    nav.querySelector('.bb-nav-hamburger').addEventListener('click', function() {
      nav.classList.toggle('open');
    });

    return nav;
  }

  // ── Build Prev/Next Footer ────────────────────────────────
  function buildPageNav() {
    var idx = getCurrentPageIndex();
    if (idx < 0) return null;

    var footer = document.createElement('div');
    footer.className = 'bb-page-nav';

    var prev = idx > 0 ? PAGE_ORDER[idx - 1] : null;
    var next = idx < PAGE_ORDER.length - 1 ? PAGE_ORDER[idx + 1] : null;

    footer.innerHTML = '<div class="bb-page-nav-inner">'
      + (prev ? '<a href="' + BASE + prev.href + '" class="bb-page-prev">← ' + prev.title + '</a>' : '<span></span>')
      + (next ? '<a href="' + BASE + next.href + '" class="bb-page-next">' + next.title + ' →</a>' : '<span></span>')
      + '</div>';

    return footer;
  }

  // ── Build Site Footer ─────────────────────────────────────
  function buildFooter() {
    var footer = document.createElement('footer');
    footer.className = 'bb-site-footer';
    footer.innerHTML = '<div class="bb-footer-inner">'
      + '<div class="bb-footer-col">'
      + '<h4>ContextWeaver</h4>'
      + '<a href="' + BASE + 'contextweaver/index.html">ContextWeaver</a>'
      + '<a href="' + BASE + 'index.html#contextweaver">Governed lifecycle</a>'
      + '<a href="' + BASE + 'index.html#product">Product experience</a>'
      + '<a href="' + BASE + 'docs/documents/azure-production-platform-and-poc.html">NextGen architecture</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Platform guides</h4>'
      + '<a href="' + BASE + 'index.html#roles">Platform teams</a>'
      + '<a href="' + BASE + 'docs/documents/dynamic-agent-mcp-lifecycle.html">Agents and MCPs</a>'
      + '<a href="' + BASE + 'docs/documents/governed-rag-ingestion.html">Governed RAG</a>'
      + '<a href="' + BASE + 'docs/documents/durable-asynchronous-execution.html">Durable execution</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Trust</h4>'
      + '<a href="' + BASE + 'docs/documents/continuous-entitlement-enforcement.html">Continuous authorization</a>'
      + '<a href="' + BASE + 'docs/documents/credential-non-possession.html">Credential isolation</a>'
      + '<a href="' + BASE + 'docs/documents/agent-sandbox-security.html">Agent sandbox</a>'
      + '<a href="' + BASE + 'docs/documents/observability-standard.html">Observability standard</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Resources</h4>'
      + '<a href="' + BASE + 'docs/index.html">Documentation</a>'
      + '<a href="' + BASE + 'docs/index.html#library">Technical library</a>'
      + '<a href="' + BASE + 'docs/features/contextweaver-product-brochure.html">Product brochure</a>'
      + '<a href="https://app.brainzbytes.com" target="_blank">Launch App ↗</a>'
      + '</div>'
      + '</div>'
      + '<div class="bb-footer-bottom">'
      + '<p>© ' + new Date().getFullYear() + ' BrainzBytes. All rights reserved.</p>'
      + '</div>';
    return footer;
  }

  // ── Inject Navigation on DOMContentLoaded ─────────────────
  document.addEventListener('DOMContentLoaded', function() {
    // Inject global nav at top of body
    var nav = buildNav();
    document.body.insertBefore(nav, document.body.firstChild);

    // Add body padding for fixed nav
    document.body.style.paddingTop = '64px';

    // Inject prev/next page navigation
    var pageNav = buildPageNav();
    if (pageNav) document.body.appendChild(pageNav);

    // Inject site footer
    document.body.appendChild(buildFooter());

    // Remove old floating theme toggle if it exists
    var oldToggle = document.querySelector('.theme-toggle:not(#bb-global-nav .theme-toggle)');
    if (oldToggle) oldToggle.remove();

    // ── Scroll Reveal Animations ─────────────────────────────
    var reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-scale');
    if (reveals.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function(el) { observer.observe(el); });
    } else {
      reveals.forEach(function(el) { el.classList.add('revealed'); });
    }

    // ── Stagger children ─────────────────────────────────────
    document.querySelectorAll('.stagger').forEach(function(parent) {
      Array.from(parent.children).forEach(function(child, i) {
        child.style.setProperty('--i', i);
      });
    });

    // ── Smooth anchor scroll ─────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // ── Shared reader navigation + progress ─────────────────
    var readerNav = document.querySelector('.bbx-page-nav, .toc');
    var readerProgress = document.querySelector('.bbx-reading-progress span');
    if (readerNav) {
      var readerLinks = Array.prototype.slice.call(readerNav.querySelectorAll('a[href^="#"]'));
      var readerSections = readerLinks.map(function(link) {
        return document.querySelector(link.getAttribute('href'));
      }).filter(Boolean);

      function setReaderActive(id) {
        readerLinks.forEach(function(link) {
          var active = link.getAttribute('href') === '#' + id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }

      if ('IntersectionObserver' in window) {
        var readerObserver = new IntersectionObserver(function(entries) {
          var visible = entries.filter(function(entry) {
            return entry.isIntersecting;
          }).sort(function(a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });
          if (visible.length) setReaderActive(visible[0].target.id);
        }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, .1, .35] });
        readerSections.forEach(function(section) { readerObserver.observe(section); });
      }
    }

    function updateReaderProgress() {
      if (!readerProgress) return;
      var root = document.documentElement;
      var remaining = root.scrollHeight - root.clientHeight;
      var value = remaining > 0 ? Math.min(100, Math.max(0, root.scrollTop / remaining * 100)) : 0;
      readerProgress.style.width = value + '%';
    }
    window.addEventListener('scroll', updateReaderProgress, { passive: true });
    window.addEventListener('resize', updateReaderProgress);
    updateReaderProgress();

    // ── Close dropdown on outside click ──────────────────────
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.bb-nav-item.has-dropdown')) {
        document.querySelectorAll('.bb-nav-item.has-dropdown').forEach(function(item) {
          item.classList.remove('show');
        });
      }
    });

    // ── Dropdown toggle (click-based, all screen sizes) ─────
    document.querySelectorAll('.bb-nav-item.has-dropdown > .bb-nav-link').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var parent = link.parentElement;
        var wasOpen = parent.classList.contains('show');
        // Close all other dropdowns first
        document.querySelectorAll('.bb-nav-item.has-dropdown').forEach(function(item) {
          item.classList.remove('show');
        });
        // Toggle this one
        if (!wasOpen) {
          parent.classList.add('show');
        }
      });
    });

    // ── Keyboard navigation (Escape closes nav) ─────────────
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        nav.classList.remove('open');
        document.querySelectorAll('.bb-nav-item.has-dropdown').forEach(function(item) {
          item.classList.remove('show');
        });
      }
    });
  });
})();
