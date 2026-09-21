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
    if (p.indexOf('/contextweaver/') >= 0) return '../';
    return '';
  })();

  var NAV_SECTIONS = [
    { label: 'Home', href: BASE + 'index.html', icon: '🏠' },
    { label: 'Product', href: BASE + 'contextweaver/index.html', icon: '🧠' },
    { label: 'Architecture', href: BASE + 'architecture.html', icon: '🏗️',
      children: [
        { label: 'Overview', href: BASE + 'architecture.html' },
        { label: 'Azure', href: BASE + 'architecture-azure.html' },
        { label: 'AWS', href: BASE + 'architecture-aws.html' },
        { label: 'GCP', href: BASE + 'architecture-gcp.html' },
        { label: 'Interactive Diagram', href: BASE + 'architecture-diagram.html' },
        { label: 'Infrastructure', href: BASE + 'infrastructure-diagram.html' },
        { label: 'Weave Diagram', href: BASE + 'weave-diagram.html' },
        { label: 'Workflow Diagram', href: BASE + 'workflow-diagram.html' }
      ]
    },
    { label: 'Use Cases', href: BASE + 'scenario.html', icon: '🎯',
      children: [
        { label: 'Travel Booking (Voice)', href: BASE + 'scenario.html' },
        { label: 'Travel Planner', href: BASE + 'scenario-travel-planner.html' },
        { label: 'DevOps & CI/CD', href: BASE + 'scenario-devops.html' },
        { label: 'Salesforce CRM', href: BASE + 'scenario-salesforce.html' },
        { label: 'Trading & Finance', href: BASE + 'scenario-trading.html' },
        { label: 'Tax Preparation', href: BASE + 'scenario-tax.html' },
        { label: 'Gym & Fitness', href: BASE + 'scenario-gym.html' },
        { label: 'Matchmaking', href: BASE + 'scenario-matchmaking.html' }
      ]
    },
    { label: 'Security', href: BASE + 'security.html', icon: '🔐',
      children: [
        { label: 'Security Deep Dive', href: BASE + 'security.html' },
        { label: 'Dual Auth Flow', href: BASE + 'dual-auth-diagram.html' }
      ]
    },
    { label: 'Business', href: BASE + 'business.html', icon: '💼',
      children: [
        { label: 'Business Case', href: BASE + 'business.html' },
        { label: 'Investor Pitch', href: BASE + 'pitch.html' },
        { label: 'Presentation', href: BASE + 'presentation.html' },
        { label: 'Video Demo', href: BASE + 'video.html' }
      ]
    }
  ];

  // Ordered page list for prev/next navigation
  var PAGE_ORDER = [
    { href: 'index.html', title: 'Home' },
    { href: 'contextweaver/index.html', title: 'Product Overview' },
    { href: 'architecture.html', title: 'Architecture Overview' },
    { href: 'architecture-azure.html', title: 'Architecture — Azure' },
    { href: 'architecture-aws.html', title: 'Architecture — AWS' },
    { href: 'architecture-gcp.html', title: 'Architecture — GCP' },
    { href: 'architecture-diagram.html', title: 'Interactive Architecture Diagram' },
    { href: 'infrastructure-diagram.html', title: 'Infrastructure Diagram' },
    { href: 'weave-diagram.html', title: 'Weave Diagram' },
    { href: 'workflow-diagram.html', title: 'Workflow Diagram' },
    { href: 'scenario.html', title: 'Use Case — Travel Booking' },
    { href: 'scenario-travel-planner.html', title: 'Use Case — Travel Planner' },
    { href: 'scenario-devops.html', title: 'Use Case — DevOps' },
    { href: 'scenario-salesforce.html', title: 'Use Case — Salesforce' },
    { href: 'scenario-trading.html', title: 'Use Case — Trading' },
    { href: 'scenario-tax.html', title: 'Use Case — Tax' },
    { href: 'scenario-gym.html', title: 'Use Case — Gym' },
    { href: 'scenario-matchmaking.html', title: 'Use Case — Matchmaking' },
    { href: 'security.html', title: 'Security Deep Dive' },
    { href: 'dual-auth-diagram.html', title: 'Dual Auth Flow' },
    { href: 'business.html', title: 'Business Case' },
    { href: 'pitch.html', title: 'Investor Pitch' },
    { href: 'presentation.html', title: 'Presentation' },
    { href: 'video.html', title: 'Video Demo' }
  ];

  function getCurrentPageIndex() {
    var p = location.pathname.replace(/^\//, '');
    if (p === '' || p === '/') p = 'index.html';
    for (var i = 0; i < PAGE_ORDER.length; i++) {
      if (p === PAGE_ORDER[i].href || p.endsWith('/' + PAGE_ORDER[i].href) || p.endsWith(PAGE_ORDER[i].href)) {
        return i;
      }
    }
    return -1;
  }

  function isActivePage(href) {
    // Extract filename from current URL and href, compare exactly
    var p = location.pathname.replace(/.*\//, '') || 'index.html';
    var h = href.replace(/.*\//, '') || 'index.html';
    // Special case: contextweaver/index.html vs root index.html
    if (href.indexOf('contextweaver/') >= 0) {
      return location.pathname.indexOf('contextweaver/') >= 0 && p === h;
    }
    return p === h && location.pathname.indexOf('contextweaver/') < 0;
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

  // ── Build Navigation Bar ──────────────────────────────────
  function buildNav() {
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
      item.className = 'bb-nav-item' + (isSectionActive(section) ? ' active' : '');

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
      + '<h4>Product</h4>'
      + '<a href="' + BASE + 'contextweaver/index.html">ContextWeaver</a>'
      + '<a href="' + BASE + 'architecture.html">Architecture</a>'
      + '<a href="' + BASE + 'security.html">Security</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Use Cases</h4>'
      + '<a href="' + BASE + 'scenario.html">Travel Booking</a>'
      + '<a href="' + BASE + 'scenario-devops.html">DevOps</a>'
      + '<a href="' + BASE + 'scenario-salesforce.html">Salesforce</a>'
      + '<a href="' + BASE + 'scenario-trading.html">Trading</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Business</h4>'
      + '<a href="' + BASE + 'business.html">Business Case</a>'
      + '<a href="' + BASE + 'pitch.html">Investor Pitch</a>'
      + '<a href="' + BASE + 'presentation.html">Presentation</a>'
      + '</div>'
      + '<div class="bb-footer-col">'
      + '<h4>Platform</h4>'
      + '<a href="https://app.brainzbytes.com" target="_blank">Launch App ↗</a>'
      + '<a href="' + BASE + 'video.html">Video Demo</a>'
      + '<a href="' + BASE + 'cluster-view-mockups.html">Cluster View</a>'
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
