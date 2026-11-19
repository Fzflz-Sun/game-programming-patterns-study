/*
 * Bookleaf shared annotations — stars, ink and notes.
 *
 * Every change is a tiny whole-value operation. Operations are applied to the
 * local cache immediately, queued in localStorage, then merged into the JSON
 * file in the configured GitHub repository. Reads are public; writing needs a
 * fine-grained GitHub token with Contents: Read and write on that repository.
 *
 * Configuration is injected by app.js after it has loaded the book manifest:
 *   BookleafAnnot.configure({ owner, repo, branch, path, bookId })
 */
(function () {
  'use strict';

  var NOTE_MAX = 10000;
  var KINDS = { hl: 1, hg: 1, hb: 1, hp: 1, r: 1, b: 1, g: 1, p: 1 };
  var cfg = null;
  var remote = empty();
  var pending = {};
  var state = empty();
  var status = 'idle';
  var detail = '';
  var subs = [];
  var lastRefresh = 0;
  var refreshing = null;
  var flushing = false;
  var timer = null;

  function empty() { return { v: 2, stars: {}, marks: {}, notes: {} }; }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function parse(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function normalize(o) {
    o = o && typeof o === 'object' ? o : {};
    return { v: 2, stars: o.stars || {}, marks: o.marks || {}, notes: o.notes || {} };
  }
  function bucket(s, kind) { return kind === 'star' ? s.stars : kind === 'marks' ? s.marks : s.notes; }
  function applyOps(base, ops) {
    var s = clone(base);
    Object.keys(ops).forEach(function (token) {
      var i = token.indexOf(':');
      var b = bucket(s, token.slice(0, i)), key = token.slice(i + 1), v = ops[token];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete b[key];
      else b[key] = v;
    });
    return s;
  }

  var tokenKey, cacheKey, pendingKey;
  function setKeys() {
    var ns = 'bookleaf:' + (cfg.bookId || 'book') + ':' + cfg.owner + '/' + cfg.repo + ':' + (cfg.path || 'annotations.json');
    tokenKey = ns + ':token';
    cacheKey = ns + ':cache';
    pendingKey = ns + ':pending';
  }
  function apiUrl() {
    return 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo) + '/contents/' + cfg.path.split('/').map(encodeURIComponent).join('/');
  }
  function authHeaders(json) {
    var h = { Accept: 'application/vnd.github+json' };
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function token() { return ls(tokenKey) || ''; }
  function pendingCount() { return Object.keys(pending).length; }
  function idleStatus() { return pendingCount() ? (token() ? 'pending' : 'local') : 'synced'; }
  function b64enc(str) {
    // Encode UTF-8 by hand so lone surrogates cannot throw.
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64dec(b) {
    var bin = atob(String(b).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function httpError(r) { var e = new Error('HTTP ' + r.status); e.status = r.status; return e; }
  function describe(e) {
    if (e && e.status === 401) return 'GitHub token invalid or expired · 令牌无效或已过期 · Token inválido';
    if (e && e.status === 403) return token() ? 'Token has no write permission / rate limited · 无权写入或请求受限 · Sin permiso de escritura' : 'GitHub rate limit · 请求过于频繁 · Límite de GitHub';
    if (e && e.status === 404) return token() ? 'Token cannot access this repository · 令牌无权访问此仓库 · Sin acceso al repositorio' : 'Repository or annotation file not found yet · 尚无云端标注 · Aún no hay anotaciones';
    if (!e || !e.status) return 'Network error · 网络错误 · Error de red';
    return 'GitHub error ' + e.status + ' · GitHub 错误 · Error de GitHub';
  }

  function emit() {
    subs.forEach(function (f) { try { f(state, status, detail); } catch (e) { console.error(e); } });
  }
  function setStatus(s, d) { status = s; detail = d || ''; emit(); }
  function recompute() { state = applyOps(remote, pending); emit(); }
  function savePending() { ls(pendingKey, Object.keys(pending).length ? JSON.stringify(pending) : null); }

  function fetchRemote() {
    if (!cfg) return Promise.reject(new Error('not configured'));
    var url = apiUrl() + '?ref=' + encodeURIComponent(cfg.branch || 'main');
    return fetch(url, { headers: authHeaders(), cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return { sha: null, data: empty() };
      if (!r.ok) throw httpError(r);
      return r.json().then(function (j) {
        if (j.content && j.encoding === 'base64') {
          return { sha: j.sha, data: normalize(parse(b64dec(j.content), null)) };
        }
        // Contents API omits inline content above 1 MB: fetch the blob.
        var h = authHeaders(); h.Accept = 'application/vnd.github.raw+json';
        return fetch(j.git_url, { headers: h, cache: 'no-store' }).then(function (rr) {
          if (!rr.ok) throw httpError(rr);
          return rr.text().then(function (t) { return { sha: j.sha, data: normalize(parse(t, null)) }; });
        });
      });
    });
  }

  function refresh(force) {
    if (!cfg) return Promise.resolve();
    if (refreshing) return refreshing;
    if (!force && Date.now() - lastRefresh < 60000) return Promise.resolve();
    lastRefresh = Date.now();
    if (status !== 'syncing') setStatus('loading');
    refreshing = fetchRemote().then(function (m) {
      remote = m.data;
      ls(cacheKey, JSON.stringify(remote));
      recompute();
      setStatus(idleStatus());
      if (pendingCount() && token()) schedule(300);
    }).catch(function (e) {
      setStatus('error', describe(e));
    }).then(function () { refreshing = null; });
    return refreshing;
  }

  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(flush, ms == null ? 850 : ms);
  }

  function flush() {
    if (!cfg) return Promise.resolve();
    if (!pendingCount()) { setStatus(idleStatus()); return Promise.resolve(); }
    if (!token()) { setStatus('local'); return Promise.resolve(); }
    if (flushing) { schedule(500); return Promise.resolve(); }
    flushing = true;
    setStatus('syncing');
    var snapshot = clone(pending);
    var attempts = 0;

    function attempt() {
      attempts++;
      return fetchRemote().then(function (m) {
        var next = applyOps(m.data, snapshot);
        var payload = { message: 'Bookleaf annotations · ' + (cfg.bookId || 'book'), content: b64enc(JSON.stringify(next)), branch: cfg.branch || 'main' };
        if (m.sha) payload.sha = m.sha;
        return fetch(apiUrl(), {
          method: 'PUT', headers: authHeaders(true), body: JSON.stringify(payload)
        }).then(function (r) {
          if ((r.status === 409 || r.status === 422) && attempts < 3) return attempt();
          if (!r.ok) throw httpError(r);
          remote = next;
          ls(cacheKey, JSON.stringify(remote));
          Object.keys(snapshot).forEach(function (k) {
            if (JSON.stringify(pending[k]) === JSON.stringify(snapshot[k])) delete pending[k];
          });
          savePending();
          recompute();
        });
      });
    }

    return attempt().then(function () {
      flushing = false;
      lastRefresh = Date.now();
      setStatus(idleStatus());
      if (pendingCount()) schedule(700);
    }, function (e) {
      flushing = false;
      setStatus('error', describe(e));
      // Authentication/authorisation failures will not heal by retrying.
      // Keep the edits on this device and let the reader refresh or reconnect.
      if (!e || !e.status || e.status === 409 || e.status === 429 || e.status >= 500) schedule(8000);
    });
  }

  function set(ops) {
    Object.keys(ops).forEach(function (k) {
      pending[k] = ops[k] == null ? null : ops[k];
    });
    savePending();
    recompute();
    setStatus(token() ? 'pending' : 'local');
    if (token()) schedule(650);
  }

  function valid(rs) {
    return (Array.isArray(rs) ? rs : []).filter(function (r) {
      return Array.isArray(r) && typeof r[0] === 'number' && typeof r[1] === 'number' &&
        r[1] > r[0] && KINDS[r[2]];
    });
  }
  function subtract(rs, s, e, pred) {
    var out = [];
    rs.forEach(function (r) {
      if (!pred(r) || r[1] <= s || r[0] >= e) { out.push(r); return; }
      if (r[0] < s) out.push([r[0], s, r[2]]);
      if (r[1] > e) out.push([e, r[1], r[2]]);
    });
    return out;
  }
  function tidy(rs) {
    rs = valid(rs).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var out = [];
    rs.forEach(function (r) {
      for (var i = 0; i < out.length; i++) {
        if (out[i][2] === r[2] && out[i][1] >= r[0]) {
          out[i][1] = Math.max(out[i][1], r[1]);
          return;
        }
      }
      out.push(r.slice());
    });
    return out;
  }
  function addMark(rs, s, e, k) {
    var isHighlight = /^h/.test(k);
    // A highlighter replaces other highlighters; an ink pen replaces other inks.
    rs = subtract(valid(rs), s, e, function (r) {
      return isHighlight ? /^h/.test(r[2]) : /^p/.test(r[2]);
    });
    rs.push([s, e, k]);
    return tidy(rs);
  }
  function clearMark(rs, s, e) { return tidy(subtract(valid(rs), s, e, function () { return true; })); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function render(text, rs) {
    text = text || '';
    var n = text.length;
    rs = valid(rs).filter(function (r) { return r[0] < n; });
    if (!rs.length) return esc(text);
    var bounds = [0, n];
    rs.forEach(function (r) { bounds.push(r[0], Math.min(r[1], n)); });
    bounds = bounds.filter(function (x, i) { return bounds.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
    var h = '';
    for (var i = 0; i < bounds.length - 1; i++) {
      var a = bounds[i], z = bounds[i + 1], cls = [];
      rs.forEach(function (r) { if (r[0] <= a && r[1] >= z) cls.push('mk-' + r[2]); });
      var seg = esc(text.slice(a, z));
      h += cls.length ? '<span class="' + cls.join(' ') + '">' + seg + '</span>' : seg;
    }
    return h;
  }

  // Keep marks on unchanged prefix/suffix after a note edit; clip the edited middle.
  function shift(rs, a, b) {
    rs = valid(rs);
    if (!rs.length) return [];
    var la = a.length, lb = b.length, p = 0, q = 0;
    while (p < la && p < lb && a[p] === b[p]) p++;
    while (q < la - p && q < lb - p && a[la - 1 - q] === b[lb - 1 - q]) q++;
    var d = lb - la;
    function m(x, end) {
      if (end ? x <= p : x < p) return x;
      if (end ? x > la - q : x >= la - q) return x + d;
      return end ? p : lb - q;
    }
    return tidy(rs.map(function (r) { return [m(r[0], false), m(r[1], true), r[2]]; }));
  }

  function configure(next) {
    if (!next || !next.owner || !next.repo) return;
    cfg = next;
    setKeys();
    // The previous GPP site stored its device token under this legacy key.
    // Reuse it once on the same GitHub Pages origin, then keep the namespaced key.
    try {
      if (!ls(tokenKey) && ls('gpp-gh-token')) ls(tokenKey, ls('gpp-gh-token'));
    } catch (e) {}
    remote = normalize(parse(ls(cacheKey), null));
    pending = parse(ls(pendingKey), {}) || {};
    recompute();
    setStatus(pendingCount() ? idleStatus() : 'loading');
    refresh(true);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { refresh(false); if (pendingCount()) flush(); }
  });
  window.addEventListener('online', function () { if (pendingCount()) flush(); });
  window.addEventListener('pagehide', function () { if (pendingCount() && token()) { try { flush(); } catch (e) {} } });

  window.BookleafAnnot = {
    NOTE_MAX: NOTE_MAX,
    configure: configure,
    get configured() { return !!cfg; },
    get state() { return state; },
    get status() { return status; },
    get detail() { return detail; },
    pendingCount: pendingCount,
    hasToken: function () { return !!token(); },
    setToken: function (t) {
      t = (t || '').trim();
      ls(tokenKey, t || null);
      setStatus(idleStatus());
      if (t) flush();
    },
    onChange: function (f) { subs.push(f); },
    refresh: refresh,
    flush: flush,
    star: function (key, on) { var o = {}; o['star:' + key] = on ? 1 : null; set(o); },
    marks: function (block, rs) { var o = {}; o['marks:' + block] = tidy(rs); set(o); },
    note: function (key, text, rs) {
      var o = {};
      o['note:' + key] = (text || '').slice(0, NOTE_MAX) || null;
      o['marks:' + key + '/note'] = text ? tidy(rs) : null;
      set(o);
    },
    addMark: addMark,
    clearMark: clearMark,
    render: render,
    shift: shift
  };
})();
