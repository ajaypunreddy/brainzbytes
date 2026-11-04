(function () {
  'use strict';

  var data = window.CW_LEARNING;
  if (!data) return;

  var state = { query: '', category: '', level: '', kind: '', letter: '', active: null };
  var byId = {};
  data.terms.forEach(function (term) { byId[term.id] = term; });

  var grid = document.getElementById('glossary-grid');
  var dialog = document.getElementById('lesson-dialog');
  var search = document.getElementById('learning-search');
  var categoryFilter = document.getElementById('category-filter');
  var levelFilter = document.getElementById('level-filter');
  var kindFilter = document.getElementById('kind-filter');
  var alphabet = document.getElementById('alphabet');
  var resultCount = document.getElementById('result-count');
  var emptyState = document.getElementById('empty-state');
  var lessonSearch = document.getElementById('lesson-search');
  var bookmarks = readSet('cw-learning-bookmarks');
  var completed = readSet('cw-learning-completed');

  document.getElementById('term-total').textContent = data.terms.length;

  Object.keys(data.categories).forEach(function (id) {
    var option = document.createElement('option');
    option.value = id;
    option.textContent = data.categories[id].label;
    categoryFilter.appendChild(option);
  });

  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (letter) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = letter;
    button.setAttribute('aria-label', 'Show terms beginning with ' + letter);
    button.addEventListener('click', function () {
      state.letter = state.letter === letter ? '' : letter;
      render();
    });
    alphabet.appendChild(button);
  });

  search.addEventListener('input', function () { state.query = search.value.trim().toLowerCase(); render(); });
  categoryFilter.addEventListener('change', function () { state.category = categoryFilter.value; render(); });
  levelFilter.addEventListener('change', function () { state.level = levelFilter.value; render(); });
  kindFilter.addEventListener('change', function () { state.kind = kindFilter.value; render(); });
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.querySelectorAll('[data-term]').forEach(function (button) {
    button.addEventListener('click', function () { openLesson(button.getAttribute('data-term')); });
  });
  dialog.querySelector('.lesson-close').addEventListener('click', closeLesson);
  dialog.addEventListener('click', function (event) { if (event.target === dialog) closeLesson(); });
  dialog.addEventListener('close', updateUrlWithoutTerm);
  document.getElementById('bookmark-term').addEventListener('click', toggleBookmark);
  document.getElementById('complete-term').addEventListener('click', toggleComplete);
  document.querySelector('.lesson-back').addEventListener('click', closeLesson);
  lessonSearch.addEventListener('input', function () { renderLessonNav(state.active, lessonSearch.value.trim().toLowerCase()); });
  document.getElementById('lesson-video-link').addEventListener('click', function () {
    var target = document.getElementById('lesson-architecture');
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (error) { return new Set(); }
  }

  function lessonIcon(id) {
    var icons = {
      'authentication': 'shield',
      'authorization': 'lock',
      'oauth-2-0': 'refresh',
      'openid-connect': 'user',
      'access-token': 'token',
      'refresh-token': 'refresh',
      'proof-key-for-code-exchange': 'key'
    };
    return iconSvg(icons[id] || 'book');
  }

  function iconSvg(name) {
    var paths = {
      user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
      application: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 16h8"/>',
      shield: '<path d="M12 2l8 3v6c0 5-3.4 8.6-8 11-4.6-2.4-8-6-8-11V5l8-3z"/><path d="M9 12l2 2 4-5"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3M12 14v3"/>',
      database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
      token: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M12 10h6M12 14h4"/>',
      refresh: '<path d="M20 6v5h-5M4 18v-5h5"/><path d="M18 10a7 7 0 00-12-3L4 9M6 14a7 7 0 0012 3l2-2"/>',
      key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M17 12v3M20 12v2"/>',
      identity: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="2.5"/><path d="M7.5 18c.7-3 2.2-4.5 4.5-4.5s3.8 1.5 4.5 4.5"/>',
      workflow: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6 8l5 8M18 8l-5 8"/>',
      external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6H5V6h6"/>',
      cursor: '<path d="M5 3l14 9-6 2-3 6-5-17z"/>',
      book: '<path d="M4 4h6a3 3 0 013 3v13a3 3 0 00-3-3H4V4zM20 4h-6a3 3 0 00-3 3v13a3 3 0 013-3h6V4z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.book) + '</svg>';
  }

  function saveSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(value))); }
    catch (error) { /* Progress remains optional if storage is unavailable. */ }
  }

  function clearFilters() {
    state.query = state.category = state.level = state.kind = state.letter = '';
    search.value = categoryFilter.value = levelFilter.value = kindFilter.value = '';
    render();
  }

  function searchable(term) {
    return [term.name, term.acronym, term.definition, term.context]
      .concat(term.aliases || [], term.related || [])
      .join(' ').toLowerCase();
  }

  function filteredTerms() {
    return data.terms.filter(function (term) {
      return (!state.query || searchable(term).indexOf(state.query) !== -1) &&
        (!state.category || term.category === state.category) &&
        (!state.level || term.level === state.level) &&
        (!state.kind || term.kind === state.kind) &&
        (!state.letter || term.name.charAt(0).toUpperCase() === state.letter);
    });
  }

  function render() {
    var terms = filteredTerms();
    grid.textContent = '';
    terms.forEach(function (term) { grid.appendChild(termCard(term)); });
    resultCount.textContent = terms.length + (terms.length === 1 ? ' lesson' : ' lessons');
    emptyState.hidden = terms.length !== 0;
    alphabet.querySelectorAll('button').forEach(function (button) {
      button.classList.toggle('active', button.textContent === state.letter);
    });
  }

  function termCard(term) {
    var category = data.categories[term.category];
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'term-card';
    card.innerHTML =
      '<span class="term-card-top"><span>' + escapeHtml(category.label) + '</span><em>' + escapeHtml(term.level) + '</em></span>' +
      '<h3>' + escapeHtml(term.name) + (term.acronym ? ' <small>' + escapeHtml(term.acronym) + '</small>' : '') + '</h3>' +
      '<p>' + escapeHtml(term.definition) + '</p>' +
      '<span>Open complete lesson →</span>';
    card.addEventListener('click', function () { openLesson(term.id); });
    return card;
  }

  function openLesson(id, preserveHistory) {
    var term = byId[id];
    if (!term) return;
    var category = data.categories[term.category];
    state.active = term;
    text('lesson-category', category.label);
    text('lesson-title', term.name + (term.acronym ? ' (' + term.acronym + ')' : ''));
    text('lesson-summary', learningPromise(term, category));
    text('lesson-definition', term.definition);
    text('lesson-solves', solvesFor(term));
    text('lesson-not-does', misconceptionFor(term, category));
    text('lesson-misconception', misconceptionFor(term, category));
    text('lesson-takeaway', term.definition);
    text('lesson-video-title', term.id === 'oauth-2-0' ? 'OAuth in Five Minutes — Visual guide' : term.name + ' — Visual guide');
    text('lesson-consent-copy', term.id === 'oauth-2-0' ? 'Allow this application to access your calendar?' : 'Allow this capability to act for this request?');
    text('lesson-fit-copy', term.context || category.fit);
    text('lesson-crumb-category', category.label);
    text('lesson-crumb-term', term.name);
    renderFacts(term);
    renderFlow(flowFor(term, category));
    renderList('lesson-cautions', cautionsFor(term, category));
    renderRoles(term);
    renderTermTable(term);
    renderFitFlow(term);
    renderExample(term, category);
    renderLessonNav(term, '');
    renderLessonNavigation(term);
    renderRelated(term);
    renderSources(term);
    updateProgressButtons();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.lesson-canvas').scrollTop = 0;
    if (!preserveHistory) {
      var url = new URL(window.location.href);
      url.searchParams.set('term', term.id);
      history.pushState({ term: term.id }, '', url);
    }
  }

  function learningPromise(term, category) {
    return term.definition;
  }

  function solvesFor(term) {
    return term.definition + ' It gives teams a shared, operational way to reason about this capability without losing its security and lifecycle boundaries.';
  }

  function misconceptionFor(term, category) {
    if (term.id === 'oauth-2-0') return 'OAuth 2.0 is authorization, not authentication. OpenID Connect adds identity on top of OAuth 2.0.';
    return (category.cautions && category.cautions[0]) || term.name + ' is not a substitute for explicit policy, validation, and operational evidence.';
  }

  function flowFor(term, category) {
    if (term.id === 'contextweaver') return ['Capture accountable intent', 'Resolve an approved capability graph', 'Authorize identity, data, tools, and actions', 'Execute durably with human control', 'Retain evidence and improve'];
    if (term.id === 'oauth-2-0') return ['Register the client and redirect boundary', 'Request delegated scopes', 'Authenticate and authorize the user', 'Exchange the protected code for tokens', 'Call the resource server and rotate authority'];
    if (term.id === 'retrieval-augmented-generation') return ['Ingest trusted sources', 'Create searchable chunks and vectors', 'Authorize and retrieve evidence', 'Rank and assemble model context', 'Generate, cite, and evaluate'];
    if (term.id === 'model-context-protocol') return ['Start a host and MCP client', 'Connect to an approved server', 'Discover tools, resources, and prompts', 'Authorize and invoke a capability', 'Validate the result and retain a receipt'];
    if (term.id === 'distributed-tracing') return ['Create or receive trace context', 'Propagate context across every boundary', 'Record spans and meaningful attributes', 'Export telemetry to a backend', 'Follow the causal path to diagnose behavior'];
    return category.flow;
  }

  function cautionsFor(term, category) {
    var items = category.cautions.slice();
    if (/cache/i.test(term.name)) items.push('Include identity, tenant, policy, source version, and model version wherever they can change correctness.');
    if (/agent|tool|mcp/i.test(term.name)) items.push('Treat model-selected actions and external tool results as untrusted until policy and schema validation succeed.');
    if (/token|oauth|identity|authorization/i.test(term.name)) items.push('Prefer narrow, short-lived, audience-bound authority and never expose reusable credentials to an Agent.');
    return items.slice(0, 5);
  }

  function exampleFor(term, category) {
    return 'ContextWeaver example: ' + (term.context || category.fit) + ' A production implementation also records the selected version, identity context, policy decision, dependency result, and correlated evidence.';
  }

  function rolesFor(term) {
    if (term.id === 'oauth-2-0') return [
      ['Resource Owner', 'The user who owns the resources.'],
      ['Client', 'The application that requests access.'],
      ['Authorization Server', 'Verifies the user and issues tokens.'],
      ['Resource Server', 'Hosts the protected resources.']
    ];
    if (term.id === 'retrieval-augmented-generation') return [
      ['Knowledge Owner', 'Publishes trusted source material.'],
      ['Retriever', 'Finds authorized, relevant evidence.'],
      ['Generator', 'Uses evidence to form an answer.'],
      ['Evaluator', 'Checks grounding, quality, and safety.']
    ];
    return [
      ['Requester', 'Expresses the goal and accountable intent.'],
      ['ContextWeaver', 'Coordinates identity, policy, and execution.'],
      [term.name, 'Provides the focused capability described here.'],
      ['Evidence Store', 'Retains decisions, results, and provenance.']
    ];
  }

  function renderRoles(term) {
    var target = document.getElementById('lesson-role-grid');
    target.textContent = '';
    var icons = ['user', 'application', 'shield', 'database'];
    rolesFor(term).forEach(function (role, index) {
      var item = document.createElement('div');
      item.className = 'lesson-role';
      item.innerHTML = '<i>' + iconSvg(icons[index]) + '</i><b>' + escapeHtml(role[0]) + '</b><span>' + escapeHtml(role[1]) + '</span>';
      target.appendChild(item);
    });
  }

  function renderFlow(values) {
    var target = document.getElementById('lesson-flow-list');
    var icons = ['user', 'application', 'shield', 'token', 'database'];
    target.textContent = '';
    values.forEach(function (value, index) {
      var item = document.createElement('li');
      item.innerHTML = '<i>' + iconSvg(icons[index % icons.length]) + '</i><span>' + escapeHtml(value) + '</span>';
      target.appendChild(item);
    });
  }

  function renderTermTable(term) {
    var target = document.getElementById('lesson-term-table');
    var rows = [[term.name, term.definition]];
    (term.related || []).slice(0, 4).forEach(function (id) {
      if (byId[id]) rows.push([byId[id].name, byId[id].definition]);
    });
    target.textContent = '';
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + escapeHtml(row[0]) + '</td><td>' + escapeHtml(row[1]) + '</td>';
      target.appendChild(tr);
    });
  }

  function fitStepsFor(term) {
    if (term.id === 'oauth-2-0') return ['User / Web', 'Auth Gateway', 'Identity Context', 'Token Broker', 'Capability Gateway', 'External API'];
    return ['Intent', 'Identity', term.name, 'Policy', 'Evidence', 'Outcome'];
  }

  function renderFitFlow(term) {
    var target = document.getElementById('lesson-fit-flow');
    target.textContent = '';
    var icons = ['user', 'shield', 'identity', 'token', 'workflow', 'external'];
    fitStepsFor(term).forEach(function (value, index) {
      var step = document.createElement('span');
      step.className = 'lesson-fit-step';
      step.innerHTML = '<i>' + iconSvg(icons[index]) + '</i>' + escapeHtml(value);
      target.appendChild(step);
    });
  }

  function renderExample(term, category) {
    var target = document.getElementById('lesson-example');
    target.textContent = '';
    var icons = ['cursor', 'shield', 'token'];
    flowFor(term, category).slice(0, 3).forEach(function (value, index) {
      var step = document.createElement('span');
      step.innerHTML = '<i>' + iconSvg(icons[index]) + '</i><b>' + escapeHtml(value) + '</b>';
      target.appendChild(step);
    });
    var context = document.createElement('p');
    context.textContent = exampleFor(term, category);
    target.appendChild(context);
  }

  function renderLessonNav(term, query) {
    var target = document.getElementById('lesson-term-nav');
    var oauthOrder = ['authentication', 'authorization', 'oauth-2-0', 'openid-connect', 'access-token', 'refresh-token', 'proof-key-for-code-exchange'];
    var candidates;
    if (!query && term.category === 'identity-security') {
      candidates = oauthOrder.map(function (id) { return byId[id]; }).filter(Boolean);
    } else {
      candidates = data.terms.filter(function (candidate) {
        return query ? searchable(candidate).indexOf(query) !== -1 : candidate.category === term.category;
      }).slice(0, 7);
    }
    if (!candidates.some(function (candidate) { return candidate.id === term.id; }) && !query) candidates.unshift(term);
    target.textContent = '';
    candidates.forEach(function (candidate, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = candidate.id === term.id ? 'active' : '';
      var label = candidate.id === 'proof-key-for-code-exchange' ? 'PKCE' : candidate.name;
      button.innerHTML = '<span class="lesson-term-icon">' + lessonIcon(candidate.id) + '</span><span><b>' + escapeHtml(label) + '</b><small>' + escapeHtml(candidate.definition) + '</small></span><em>›</em>';
      button.addEventListener('click', function () { lessonSearch.value = ''; openLesson(candidate.id); });
      target.appendChild(button);
    });
  }

  function renderLessonNavigation(term) {
    var index = data.terms.indexOf(term);
    var previous = data.terms[(index - 1 + data.terms.length) % data.terms.length];
    var next = data.terms[(index + 1) % data.terms.length];
    var previousButton = document.getElementById('lesson-previous');
    var nextButton = document.getElementById('lesson-next');
    previousButton.querySelector('strong').textContent = previous.name;
    nextButton.querySelector('strong').textContent = next.name;
    previousButton.onclick = function () { openLesson(previous.id); };
    nextButton.onclick = function () { openLesson(next.id); };
  }

  function renderFacts(term) {
    var facts = document.getElementById('lesson-facts');
    facts.textContent = '';
    [term.level, '12 min lesson', 'Visual guide', 'Video included']
      .filter(Boolean).forEach(function (value) {
        var item = document.createElement('span');
        item.textContent = value;
        facts.appendChild(item);
      });
  }

  function renderList(id, values) {
    var target = document.getElementById(id);
    target.textContent = '';
    values.forEach(function (value) {
      var item = document.createElement('li');
      item.textContent = value;
      target.appendChild(item);
    });
  }

  function renderRelated(term) {
    var target = document.getElementById('lesson-related');
    target.textContent = '';
    (term.related || []).slice(0, 8).forEach(function (id) {
      var related = byId[id];
      if (!related) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = related.name;
      button.addEventListener('click', function () { openLesson(related.id); });
      target.appendChild(button);
    });
    if (!target.children.length) {
      var span = document.createElement('span');
      span.textContent = 'Use the category filter to explore adjacent concepts.';
      target.appendChild(span);
    }
  }

  function renderSources(term) {
    var target = document.getElementById('lesson-sources');
    target.textContent = '';
    data.references.forEach(function (source) {
      var link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = source.title + ' ↗';
      target.appendChild(link);
    });
  }

  function toggleBookmark() {
    if (!state.active) return;
    toggleSet(bookmarks, state.active.id);
    saveSet('cw-learning-bookmarks', bookmarks);
    updateProgressButtons();
    renderFacts(state.active);
  }

  function toggleComplete() {
    if (!state.active) return;
    toggleSet(completed, state.active.id);
    saveSet('cw-learning-completed', completed);
    updateProgressButtons();
    renderFacts(state.active);
  }

  function toggleSet(set, id) { set.has(id) ? set.delete(id) : set.add(id); }

  function updateProgressButtons() {
    var id = state.active && state.active.id;
    var bookmark = document.getElementById('bookmark-term');
    var complete = document.getElementById('complete-term');
    var progress = completed.has(id) ? 100 : bookmarks.has(id) ? 55 : 35;
    bookmark.textContent = bookmarks.has(id) ? '★ Bookmarked' : '☆ Bookmark';
    complete.textContent = completed.has(id) ? '✓ Completed' : '✓ Mark complete';
    bookmark.classList.toggle('active', bookmarks.has(id));
    complete.classList.toggle('active', completed.has(id));
    text('lesson-progress-label', progress + '%');
    document.getElementById('lesson-progress-bar').style.width = progress + '%';
  }

  function closeLesson() {
    updateUrlWithoutTerm();
    if (dialog.open) dialog.close();
  }

  function updateUrlWithoutTerm() {
    state.active = null;
    var url = new URL(window.location.href);
    url.searchParams.delete('term');
    history.replaceState({}, '', url);
  }

  function text(id, value) { document.getElementById(id).textContent = value; }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  window.addEventListener('popstate', function () {
    var id = new URL(window.location.href).searchParams.get('term');
    if (id) openLesson(id, true); else closeLesson();
  });

  render();
  var initial = new URL(window.location.href).searchParams.get('term');
  if (initial) openLesson(initial, true);
}());
