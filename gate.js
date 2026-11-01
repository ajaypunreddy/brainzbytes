(function() {
  var KEY = 'cw_access_2026';
  var API = 'https://app.brainzbytes.com/api/public';
  var PASS = 'contextweaver2026';

  // --- Hit tracking (fire-and-forget, runs even if already authenticated) ---
  try {
    fetch(API + '/hit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({page: location.pathname, referrer: document.referrer})
    }).catch(function(){});
  } catch(e) {}

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESS GATE DISABLED — site is public (passwordless).
  // The visitor analytics hit-tracking above still runs on every page load.
  // To RE-ENABLE the password/access-code gate, delete the `return;` below.
  // ─────────────────────────────────────────────────────────────────────────
  return;

  if (sessionStorage.getItem(KEY) === 'granted') return;

  // Block page rendering
  document.documentElement.style.visibility = 'hidden';
  document.addEventListener('DOMContentLoaded', function() {
    document.documentElement.style.visibility = 'hidden';
    document.body.style.visibility = 'hidden';

    var overlay = document.createElement('div');
    overlay.id = 'cw-gate';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:linear-gradient(135deg,#0a0e14 0%,#1a1f2e 50%,#0d1117 100%);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;visibility:visible';

    overlay.innerHTML = '<div style="text-align:center;max-width:400px;padding:40px">'
      + '<div style="font-size:3rem;margin-bottom:16px">\uD83E\uDDE0</div>'
      + '<h2 style="color:#e6edf3;margin:0 0 6px;font-size:1.4rem;font-weight:700">ContextWeaver</h2>'
      + '<p style="color:rgba(255,255,255,0.4);font-size:.82rem;margin:0 0 24px">This site is currently private.</p>'
      // Access code panel
      + '<div id="cw-code-panel">'
      + '<input id="cw-gate-pw" type="password" placeholder="Enter access code" autofocus '
      + 'style="width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(13,202,240,0.3);background:rgba(255,255,255,0.05);color:#e6edf3;font-size:1rem;outline:none;text-align:center;box-sizing:border-box">'
      + '<div id="cw-gate-err" style="color:#dc3545;font-size:.78rem;margin-top:8px;min-height:20px"></div>'
      + '<button id="cw-gate-btn" style="margin-top:8px;padding:10px 32px;border-radius:10px;border:none;background:linear-gradient(135deg,#0dcaf0,#0d6efd);color:#fff;font-size:.9rem;font-weight:600;cursor:pointer;width:100%">Enter</button>'
      + '<div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px">'
      + '<p style="color:rgba(255,255,255,0.3);font-size:.78rem;margin:0 0 8px">Don\'t have an access code?</p>'
      + '<button id="cw-req-toggle" style="padding:8px 24px;border-radius:8px;border:1px solid rgba(255,193,7,0.3);background:rgba(255,193,7,0.08);color:#ffc107;font-size:.82rem;cursor:pointer;font-weight:600">Request Access</button>'
      + '</div>'
      + '</div>'
      // Request access panel (hidden)
      + '<div id="cw-req-panel" style="display:none">'
      + '<input id="cw-req-name" type="text" placeholder="Your name *" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e6edf3;font-size:.9rem;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<input id="cw-req-email" type="email" placeholder="Email address *" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e6edf3;font-size:.9rem;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<input id="cw-req-company" type="text" placeholder="Company (optional)" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e6edf3;font-size:.9rem;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<input id="cw-req-reason" type="text" placeholder="Brief reason for access (optional)" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#e6edf3;font-size:.9rem;outline:none;box-sizing:border-box;margin-bottom:8px">'
      + '<div id="cw-req-err" style="color:#dc3545;font-size:.78rem;min-height:20px"></div>'
      + '<div id="cw-req-ok" style="color:#198754;font-size:.82rem;min-height:20px;display:none"></div>'
      + '<button id="cw-req-btn" style="margin-top:4px;padding:10px 32px;border-radius:10px;border:none;background:linear-gradient(135deg,#ffc107,#ff6b6b);color:#000;font-size:.9rem;font-weight:600;cursor:pointer;width:100%">Submit Request</button>'
      + '<button id="cw-req-back" style="margin-top:10px;padding:6px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.3);font-size:.78rem;cursor:pointer">\u2190 Back to access code</button>'
      + '</div>'
      + '<p style="color:rgba(255,255,255,0.15);font-size:.65rem;margin-top:24px">\u00A9 2026 BrainzBytes LLC</p>'
      + '</div>';
    document.body.appendChild(overlay);

    function grantAccess() {
      sessionStorage.setItem(KEY, 'granted');
      overlay.remove();
      document.documentElement.style.visibility = '';
      document.body.style.visibility = '';
    }

    function tryAccess() {
      var val = document.getElementById('cw-gate-pw').value.trim();
      if (!val) return;

      // Check master password
      if (val === PASS) { grantAccess(); return; }

      // Check unique code via API
      var errEl = document.getElementById('cw-gate-err');
      errEl.textContent = 'Verifying...';
      errEl.style.color = 'rgba(255,255,255,0.3)';
      fetch(API + '/validate-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: val})
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.valid) { grantAccess(); }
          else {
            errEl.style.color = '#dc3545';
            errEl.textContent = 'Invalid access code';
            document.getElementById('cw-gate-pw').value = '';
            document.getElementById('cw-gate-pw').focus();
          }
        }).catch(function() {
          // If API unreachable, only allow master password
          errEl.style.color = '#dc3545';
          errEl.textContent = 'Invalid access code';
          document.getElementById('cw-gate-pw').value = '';
        });
    }

    document.getElementById('cw-gate-btn').addEventListener('click', tryAccess);
    document.getElementById('cw-gate-pw').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') tryAccess();
    });

    // Toggle between code entry and request form
    document.getElementById('cw-req-toggle').addEventListener('click', function() {
      document.getElementById('cw-code-panel').style.display = 'none';
      document.getElementById('cw-req-panel').style.display = 'block';
      document.getElementById('cw-req-name').focus();
    });
    document.getElementById('cw-req-back').addEventListener('click', function() {
      document.getElementById('cw-req-panel').style.display = 'none';
      document.getElementById('cw-code-panel').style.display = 'block';
      document.getElementById('cw-gate-pw').focus();
    });

    // Submit access request
    document.getElementById('cw-req-btn').addEventListener('click', function() {
      var name = document.getElementById('cw-req-name').value.trim();
      var email = document.getElementById('cw-req-email').value.trim();
      var company = document.getElementById('cw-req-company').value.trim();
      var reason = document.getElementById('cw-req-reason').value.trim();
      var errEl = document.getElementById('cw-req-err');
      var okEl = document.getElementById('cw-req-ok');

      if (!name || !email) {
        errEl.textContent = 'Name and email are required';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address';
        return;
      }

      errEl.textContent = '';
      document.getElementById('cw-req-btn').disabled = true;
      document.getElementById('cw-req-btn').textContent = 'Submitting...';

      fetch(API + '/access-request', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name, email: email, company: company, reason: reason})
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.ok) {
            okEl.style.display = 'block';
            okEl.textContent = '\u2705 Request submitted! You\'ll receive an access code once approved.';
            document.getElementById('cw-req-btn').style.display = 'none';
            document.getElementById('cw-req-name').disabled = true;
            document.getElementById('cw-req-email').disabled = true;
            document.getElementById('cw-req-company').disabled = true;
            document.getElementById('cw-req-reason').disabled = true;
          } else {
            errEl.textContent = d.error || 'Failed to submit request';
            document.getElementById('cw-req-btn').disabled = false;
            document.getElementById('cw-req-btn').textContent = 'Submit Request';
          }
        }).catch(function(e) {
          errEl.textContent = 'Network error. Please try again.';
          document.getElementById('cw-req-btn').disabled = false;
          document.getElementById('cw-req-btn').textContent = 'Submit Request';
        });
    });
  });
})();
