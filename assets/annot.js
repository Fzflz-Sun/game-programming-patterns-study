(function () {
  'use strict';

  var OWNER = 'Fzflz-Sun', REPO = 'game-programming-patterns-study', BRANCH = 'annotations', FILE = 'annotations.json';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE;
  var K_CACHE = 'gpp-annot-cache', K_PENDING = 'gpp-annot-pending', K_TOKEN = 'gpp-gh-token';
  var NOTE_MAX = 10000;
  var KINDS = { hl: 1, r: 1, b: 1, g: 1, p: 1 };

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
    return { v: 1, stars: o.stars || {}, marks: o.marks || {}, notes: o.notes || {} };
  }
  function bucket(s, kind) { return kind === 'star' ? s.stars : kind === 'marks' ? s.marks : s.notes; }
  // ops: { "<kind>:<key>": value|null }, whole-value writes so concurrent devices merge per item
  function applyOps(base, ops) {
    var s = clone(base);
    Object.keys(ops).forEach(function (t) {
      var i = t.indexOf(':');
      var b = bucket(s, t.slice(0, i)), key = t.slice(i + 1), v = ops[t];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete b[key];
      else b[key] = v;
    });
    return s;
  }

  var remote = normalize(parse(ls(K_CACHE), null));
  var pending = parse(ls(K_PENDING), {}) || {};
  var state = applyOps(remote, pending);
  var status = 'loading', detail = '';
  var subs = [];

  function emit() { subs.forEach(function (f) { try { f(state, status, detail); } catch (e) { console.error(e); } }); }
  function setStatus(s, d) { status = s; detail = d || ''; emit(); }
  function recompute() { state = applyOps(remote, pending); }
  function savePending() { ls(K_PENDING, Object.keys(pending).length ? JSON.stringify(pending) : null); }
  function pendingCount() { return Object.keys(pending).length; }
  function token() { return ls(K_TOKEN) || ''; }
  function idleStatus() { return pendingCount() ? (token() ? 'pending' : 'local') : 'synced'; }
  function headers(json) {
    var h = { Accept: 'application/vnd.github+json' };
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64dec(b) {
    var bin = atob(b.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function httpError(r) { var e = new Error('HTTP ' + r.status); e.status = r.status; return e; }
  function describe(e) {
    if (e.status === 401) return '令牌无效或已过期 Invalid or expired token';
    if (e.status === 403) return token() ? '令牌没有写入权限，或请求过于频繁 No write permission / rate limited' : 'GitHub 请求过于频繁，请稍后再试 Rate limited';
    if (e.status === 404) return token() ? '令牌无权访问此仓库 Token cannot access this repo' : '找不到云端数据 Data not found';
    if (!e.status) return '网络错误 Network error';
    return 'GitHub 错误 Error ' + e.status;
  }

  function fetchRemote() {
    return fetch(API + '?ref=' + BRANCH, { headers: headers(), cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw httpError(r);
      return r.json();
    }).then(function (j) {
      if (j.content && j.encoding === 'base64') return { sha: j.sha, data: normalize(parse(b64dec(j.content), null)) };
      // files over 1MB come back without inline content
      var h = headers(); h.Accept = 'application/vnd.github.raw+json';
      return fetch(j.git_url, { headers: h, cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw httpError(r);
        return r.text();
      }).then(function (t) { return { sha: j.sha, data: normalize(parse(t, null)) }; });
    });
  }

  var lastRefresh = 0, refreshing = null;
  function refresh(force) {
    if (refreshing) return refreshing;
    if (!force && Date.now() - lastRefresh < 60000) return Promise.resolve();
    lastRefresh = Date.now();
    if (status !== 'syncing') setStatus('loading');
    refreshing = fetchRemote().then(function (m) {
      remote = m.data;
      ls(K_CACHE, JSON.stringify(remote));
      recompute();
      setStatus(idleStatus());
      if (pendingCount() && token()) schedule(300);
    }).catch(function (e) {
      setStatus('error', describe(e));
    }).then(function () { refreshing = null; });
    return refreshing;
  }

  var timer = null, flushing = false;
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms == null ? 1200 : ms); }
  function flush() {
    if (!pendingCount()) { setStatus(idleStatus()); return Promise.resolve(); }
    if (!token()) { setStatus('local'); return Promise.resolve(); }
    if (flushing) { schedule(); return Promise.resolve(); }
    flushing = true;
    setStatus('syncing');
    var snap = clone(pending);
    function attempt(n) {
      return fetchRemote().then(function (m) {
        var next = applyOps(m.data, snap);
        return fetch(API, {
          method: 'PUT', headers: headers(true),
          body: JSON.stringify({ message: 'Update annotations', content: b64enc(JSON.stringify(next)), sha: m.sha, branch: BRANCH })
        }).then(function (r) {
          if ((r.status === 409 || r.status === 422) && n < 3) return attempt(n + 1);
          if (!r.ok) throw httpError(r);
          remote = next;
          ls(K_CACHE, JSON.stringify(remote));
          Object.keys(snap).forEach(function (t) {
            if (JSON.stringify(pending[t]) === JSON.stringify(snap[t])) delete pending[t];
          });
          savePending();
          recompute();
        });
      });
    }
    return attempt(0).then(function () {
      flushing = false;
      lastRefresh = Date.now();
      setStatus(idleStatus());
      if (pendingCount()) schedule();
    }, function (e) {
      flushing = false;
      setStatus('error', describe(e));
    });
  }

  function set(ops) {
    Object.keys(ops).forEach(function (t) { pending[t] = ops[t] == null ? null : ops[t]; });
    savePending();
    recompute();
    setStatus(token() ? 'pending' : 'local');
    if (token()) schedule();
  }

  // Ranges are [start, end, kind] over a block's plain text; kind is 'hl' or a color letter.
  function valid(rs) {
    return (Array.isArray(rs) ? rs : []).filter(function (r) {
      return Array.isArray(r) && typeof r[0] === 'number' && typeof r[1] === 'number' && r[1] > r[0] && KINDS[r[2]];
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
        if (out[i][2] === r[2] && out[i][1] >= r[0]) { out[i][1] = Math.max(out[i][1], r[1]); return; }
      }
      out.push(r.slice());
    });
    return out;
  }
  function addMark(rs, s, e, k) {
    var isHl = k === 'hl';
    rs = subtract(valid(rs), s, e, function (r) { return isHl ? r[2] === 'hl' : r[2] !== 'hl'; });
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
    var b = [0, n];
    rs.forEach(function (r) { b.push(r[0], Math.min(r[1], n)); });
    b = b.filter(function (x, i) { return b.indexOf(x) === i; }).sort(function (x, y) { return x - y; });
    var h = '';
    for (var i = 0; i < b.length - 1; i++) {
      var a = b[i], z = b[i + 1], cls = [];
      rs.forEach(function (r) { if (r[0] <= a && r[1] >= z) cls.push(r[2] === 'hl' ? 'mk-hl' : 'mk-c-' + r[2]); });
      var seg = esc(text.slice(a, z));
      h += cls.length ? '<span class="' + cls.join(' ') + '">' + seg + '</span>' : seg;
    }
    return h;
  }
  // Re-anchor ranges after a text edit: keep marks on the unchanged prefix/suffix, clip the edited middle.
  function shift(rs, a, b) {
    rs = valid(rs);
    if (!rs.length) return [];
    var la = a.length, lb = b.length, p = 0, q = 0;
    while (p < la && p < lb && a[p] === b[p]) p++;
    while (q < la - p && q < lb - p && a[la - 1 - q] === b[lb - 1 - q]) q++;
    var d = lb - la;
    // Insertions at a range boundary stay outside the range.
    function m(x, end) {
      if (end ? x <= p : x < p) return x;
      if (end ? x > la - q : x >= la - q) return x + d;
      return end ? p : lb - q;
    }
    return tidy(rs.map(function (r) { return [m(r[0], false), m(r[1], true), r[2]]; }));
  }

  window.GPPAnnot = {
    NOTE_MAX: NOTE_MAX,
    get state() { return state; },
    get status() { return status; },
    get detail() { return detail; },
    pendingCount: pendingCount,
    hasToken: function () { return !!token(); },
    setToken: function (t) {
      t = (t || '').trim();
      ls(K_TOKEN, t || null);
      setStatus(idleStatus());
      if (t) flush();
    },
    onChange: function (f) { subs.push(f); },
    refresh: refresh,
    flush: flush,
    star: function (key, on) { var o = {}; o['star:' + key] = on ? 1 : null; set(o); },
    marks: function (blk, rs) { var o = {}; o['marks:' + blk] = tidy(rs); set(o); },
    note: function (key, text, rs) {
      var o = {};
      o['note:' + key] = text || null;
      o['marks:' + key + '/note'] = text ? tidy(rs) : null;
      set(o);
    },
    addMark: addMark,
    clearMark: clearMark,
    render: render,
    shift: shift
  };

  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(false); });
  window.addEventListener('online', function () { flush(); });
  refresh(true);
})();
