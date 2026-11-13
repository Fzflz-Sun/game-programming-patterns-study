(function () {
  'use strict';

  var root = document.documentElement;
  var main = document.getElementById('main');
  var sidebar = document.getElementById('sidebar');
  var toc = null;
  var flat = [];
  var cache = {};

  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function getProgress() {
    try { return JSON.parse(store('gpp-progress') || '{}') || {}; } catch (e) { return {}; }
  }
  function saveProgress(p) { store('gpp-progress', JSON.stringify(p)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Theme
  function isDark() {
    var t = root.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    store('gpp-theme', next);
  });

  // Language
  var langSeg = document.getElementById('langSeg');
  function setLang(l) {
    root.dataset.lang = l;
    store('gpp-lang', l);
    Array.prototype.forEach.call(langSeg.children, function (b) {
      b.classList.toggle('on', b.dataset.lang === l);
    });
  }
  langSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) setLang(b.dataset.lang);
  });
  setLang(store('gpp-lang') || 'both');

  // Mobile nav
  var menuBtn = document.getElementById('menuBtn');
  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); });
  document.getElementById('scrim').addEventListener('click', function () { setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  function bi(o, tag) {
    tag = tag || 'p';
    if (!o) return '';
    return '<div class="bi"><' + tag + ' class="zh" lang="zh">' + esc(o.zh) + '</' + tag + '><' + tag + ' class="en" lang="en">' + esc(o.en) + '</' + tag + '></div>';
  }

  function highlight(code) {
    var kws = /\b(class|public|private|protected|virtual|void|int|float|double|bool|char|const|static|return|if|else|for|while|switch|case|break|continue|new|delete|struct|enum|typedef|template|typename|function|var|let|true|false|NULL|nullptr|this|override|unsigned|do|default|friend|inline|namespace|using|auto|sizeof)\b/g;
    var out = '';
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([^\/"']+|[\/"'])/g;
    var m;
    while ((m = re.exec(code))) {
      if (m[1]) out += '<span class="cm">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="st">' + esc(m[2]) + '</span>';
      else out += esc(m[3]).replace(kws, '<span class="kw">$1</span>').replace(/\b([A-Z][A-Za-z0-9_]*)\b(?![^<]*>)/g, '<span class="ty">$1</span>');
    }
    return out;
  }

  function chapLabel(c) {
    return c.num === 0 ? '前言 · Intro' : '第 ' + c.num + ' 章 · Ch. ' + c.num;
  }

  function renderSidebar(activeId, chapter) {
    var prog = getProgress();
    var total = flat.length;
    var done = flat.filter(function (c) { return prog[c.id] && prog[c.id].read; }).length;
    var h = '<div class="toc-progress">学习进度 Progress · ' + done + ' / ' + total +
      '<div class="bar"><i style="width:' + (100 * done / total) + '%"></i></div></div>';
    h += '<a class="toc-ch' + (activeId ? '' : ' active') + '" href="#/"><span class="n">⌂</span><span class="t">首页 Home</span></a>';
    toc.parts.forEach(function (p) {
      h += '<div class="toc-part">Part ' + p.num + '<b>' + esc(p.zh) + '</b></div>';
      p.chapters.forEach(function (c) {
        var on = c.id === activeId;
        var sc = starCount(c.id + '/');
        h += '<a class="toc-ch' + (on ? ' active' : '') + '" href="#/' + c.id + '"><span class="n">' + (c.num === 0 ? '·' : c.num) +
          '</span><span class="t">' + esc(c.zh) + '<small>' + esc(c.en) + '</small></span>' +
          (sc ? '<span class="star-n" title="本章星标 Starred in this chapter">★ ' + sc + '</span>' : '') +
          (prog[c.id] && prog[c.id].read ? '<span class="done" title="已学完">✓</span>' : '') + '</a>';
        if (on && chapter) {
          h += '<div class="toc-secs">';
          chapter.sections.forEach(function (s) {
            var ss = starCount(c.id + '/' + s.num + '/');
            h += '<a href="#/' + c.id + '/' + s.num + '"><span class="sn">' + esc(s.num) + '</span>' + esc(s.title.zh) +
              (ss ? '<span class="star-n sm">★ ' + ss + '</span>' : '') + '</a>';
          });
          if (sc) h += '<a href="#/' + c.id + '/starred"><span class="sn">★</span>只看星标 Starred only</a>';
          h += '<a href="#/' + c.id + '/practice"><span class="sn">✎</span>练习 Practice</a></div>';
        }
      });
    });
    sidebar.innerHTML = h;
  }

  function renderHome() {
    var prog = getProgress();
    var h = '<div class="content"><section class="hero"><div class="eyebrow">Robert Nystrom · 中英双语学习</div>' +
      '<h1>游戏编程模式</h1><div class="sub">Game Programming Patterns</div>' +
      '<p class="desc">以原书目录为骨架，逐章梳理知识点。每个知识点都注明出自原版的第几章第几节，并附中英对照；每章配有中英混合练习，帮助你检验理解。</p>' +
      '<div class="stats"><div class="stat"><b>' + toc.parts.length + '</b><span>篇 Parts</span></div>' +
      '<div class="stat"><b>' + flat.length + '</b><span>章 Chapters</span></div>' +
      '<div class="stat"><b id="statPts">—</b><span>知识点 Key points</span></div>' +
      '<div class="stat"><b id="statEx">—</b><span>练习 Exercises</span></div></div></section>';
    toc.parts.forEach(function (p) {
      h += '<section class="part-block"><h2><span class="pn">Part ' + p.num + '</span>' + esc(p.zh) + '<span class="en-t">' + esc(p.en) + '</span></h2><div class="cards">';
      p.chapters.forEach(function (c) {
        var pr = prog[c.id] || {};
        var sc = starCount(c.id + '/');
        h += '<a class="card" href="#/' + c.id + '"><div class="cn">' + chapLabel(c) + '</div><div class="cz">' + esc(c.zh) +
          '</div><div class="ce">' + esc(c.en) + '</div><div class="cm"><span>' +
          (pr.score != null ? '练习 ' + pr.score + '/' + pr.total : '未练习') + (sc ? ' · <span class="star-n">★ ' + sc + '</span>' : '') + '</span>' +
          (pr.read ? '<span class="ok">✓ 已学完</span>' : '') + '</div></a>';
      });
      h += '</div></section>';
    });
    h += '<p class="foot">内容基于 Robert Nystrom《Game Programming Patterns》（gameprogrammingpatterns.com）整理，仅供个人学习。中文为参考英文原版重新校译。</p></div>';
    main.innerHTML = h;
    Promise.all(flat.map(function (c) { return loadChapter(c.id).catch(function () { return null; }); })).then(function (all) {
      var pts = 0, ex = 0;
      all.forEach(function (ch) {
        if (!ch) return;
        ex += ch.exercises.length;
        ch.sections.forEach(function (s) { pts += s.points.length; });
      });
      var a = document.getElementById('statPts'), b = document.getElementById('statEx');
      if (a) a.textContent = pts;
      if (b) b.textContent = ex;
    });
  }

  function loadChapter(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return fetch('data/chapters/' + id + '.json').then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (j) { cache[id] = j; return j; });
  }

  var TYPE_LABEL = { choice: '单选 Choice', truefalse: '判断 True/False', fill: '填空 Fill-in', open: '简答 Open', scenario: '场景设计 Design' };

  function sectionRef(meta, ch, num) {
    var s = ch.sections.filter(function (x) { return x.num === num; })[0];
    var chTxt = meta.num === 0 ? 'Introduction 前言' : 'Chapter ' + meta.num + ' 第' + meta.num + '章';
    return chTxt + ' › §' + num + (s ? ' ' + s.title.en : '');
  }

  function renderChapter(meta, ch, view) {
    var idx = flat.indexOf(meta);
    var prev = flat[idx - 1], next = flat[idx + 1];
    var nPts = ch.sections.reduce(function (a, s) { return a + s.points.length; }, 0);
    var h = '<article class="content"><header class="ch-head"><div class="eyebrow">' + chapLabel(meta) + ' · ' + esc(meta.part.zh) + '</div>' +
      '<h1>' + esc(ch.title.zh) + '</h1><div class="sub">' + esc(ch.title.en) + '</div></header>' +
      '<div class="lead">' + bi(ch.summary) + '</div>' +
      '<div class="tabs" role="tablist"><button data-v="learn" class="' + (view !== 'practice' ? 'on' : '') + '">知识点 Learn<span class="count">' + nPts + '</span></button>' +
      '<button data-v="practice" class="' + (view === 'practice' ? 'on' : '') + '">练习 Practice<span class="count">' + ch.exercises.length + '</span></button></div>';

    if (view === 'practice') {
      var nScn = ch.exercises.filter(function (e) { return e.type === 'scenario'; }).length;
      h += '<div class="ex-head"><span class="ex-score" id="exScore"></span><button class="btn" id="exReset">重做 Reset</button></div>';
      if (nScn) {
        h += '<div class="ex-filter" role="group" aria-label="题型筛选 Filter">' +
          '<button data-f="all" class="on">全部 All<span>' + ch.exercises.length + '</span></button>' +
          '<button data-f="basic">基础题 Basics<span>' + (ch.exercises.length - nScn) + '</span></button>' +
          '<button data-f="scenario">场景设计 Design<span>' + nScn + '</span></button></div>';
      }
      ch.exercises.forEach(function (e, i) { h += renderExercise(meta, ch, e, i); });
    } else {
      var A = window.GPPAnnot.state, starredOnly = view === 'starred', shown = 0;
      if (starredOnly) {
        h += '<div class="filter-bar">★ 只显示本章星标知识点 Showing starred points only · <a href="#/' + meta.id + '">显示全部 Show all</a></div>';
      }
      ch.sections.forEach(function (s) {
        var ph = '';
        s.points.forEach(function (p, i) {
          var key = meta.id + '/' + s.num + '/' + i;
          var starred = !!A.stars[key];
          if (starredOnly && !starred) return;
          shown++;
          var note = A.notes[key] || '';
          ph += '<div class="point' + (starred ? ' starred' : '') + '" data-key="' + esc(key) + '">' +
            '<div class="pt-tools"><button class="star-btn" data-act="star" aria-pressed="' + starred + '" title="星标 Star">' + (starred ? '★' : '☆') + '</button></div>' +
            '<h3><span class="zh">' + mk(key + '/t.zh', p.title.zh) + '</span><span class="en">' + mk(key + '/t.en', p.title.en) + '</span></h3>' +
            '<div class="src">出处 Source <span class="tag">' + (meta.num === 0 ? 'Introduction' : 'Ch.' + meta.num + ' ' + esc(ch.title.en)) +
            '</span>›<span class="tag">§' + esc(s.num) + ' ' + esc(s.title.en) + '</span>' +
            (p.subsection ? '›<span class="tag">' + esc(p.subsection.en) + '</span>' : '') + '</div>' +
            '<div class="body"><div class="bi"><p class="zh" lang="zh">' + mk(key + '/b.zh', p.body.zh) + '</p><p class="en" lang="en">' + mk(key + '/b.en', p.body.en) + '</p></div></div>' +
            (p.code ? '<pre><code>' + highlight(p.code) + '</code></pre>' : '') +
            '<div class="note-wrap">' + noteView(key, note) + '</div></div>';
        });
        if (!ph) return;
        h += '<section class="section" id="s-' + esc(s.num) + '"><h2 class="sec-title"><span class="sn">§' + esc(s.num) +
          '</span><span class="zh-t">' + esc(s.title.zh) + '</span><span class="en-t">' + esc(s.title.en) + '</span></h2>' + ph + '</section>';
      });
      if (starredOnly && !shown) h += '<div class="loading">本章还没有星标知识点 No starred points yet.</div>';
      if (!starredOnly && ch.terms && ch.terms.length) {
        h += '<section class="section" id="s-terms"><h2 class="sec-title"><span class="sn">✦</span><span class="zh-t">关键术语</span><span class="en-t">Key Terms</span></h2><div class="terms">';
        ch.terms.forEach(function (t) { h += '<div class="term"><div class="en">' + esc(t.en) + '</div><div class="zh">' + esc(t.zh) + '</div></div>'; });
        h += '</div></section>';
      }
      h += '<div style="margin-top:32px;text-align:center"><a class="btn primary" href="#/' + meta.id + '/practice">学完了，去做练习 → Practice</a></div>';
    }

    h += '<nav class="pager">' +
      (prev ? '<a class="prev" href="#/' + prev.id + '"><small>← 上一章 Previous</small>' + esc(prev.zh) + ' · ' + esc(prev.en) + '</a>' : '') +
      (next ? '<a class="next" href="#/' + next.id + '"><small>下一章 Next →</small>' + esc(next.zh) + ' · ' + esc(next.en) + '</a>' : '') +
      '</nav></article>';
    main.innerHTML = h;

    main.dataset.key = meta.id + '|' + view;
    main.querySelector('.tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) location.hash = '#/' + meta.id + (b.dataset.v === 'practice' ? '/practice' : '');
    });
    if (view === 'practice') bindExercises(meta, ch);
    else if (view === 'learn') markRead(meta.id);
  }

  // ---------- Stars, highlights, notes ----------
  var Annot = window.GPPAnnot;

  function starCount(prefix) {
    var n = 0, s = Annot.state.stars;
    for (var k in s) if (k.indexOf(prefix) === 0) n++;
    return n;
  }
  function mk(blk, text) {
    return '<span class="mk" data-blk="' + esc(blk) + '">' + Annot.render(text, Annot.state.marks[blk]) + '</span>';
  }
  function noteView(key, note) {
    if (!note) return '<button class="note-add" data-act="note-edit">✎ 添加笔记 Add note</button>';
    return '<div class="note"><div class="note-head"><span>笔记 Note</span><span class="note-acts">' +
      '<button data-act="note-edit">编辑 Edit</button><button data-act="note-del">删除 Delete</button></span></div>' +
      '<div class="note-text">' + mk(key + '/note', note) + '</div></div>';
  }
  function noteEditor(key) {
    var cur = Annot.state.notes[key] || '';
    return '<div class="note editing"><textarea class="note-input" maxlength="' + Annot.NOTE_MAX + '" placeholder="写下你的理解（最多 10000 字）Write your note">' + esc(cur) + '</textarea>' +
      '<div class="note-foot"><span class="note-count">' + cur.length + ' / ' + Annot.NOTE_MAX + '</span>' +
      '<span><button class="btn" data-act="note-cancel">取消 Cancel</button> <button class="btn primary" data-act="note-save">保存 Save</button></span></div></div>';
  }

  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var pt = b.closest('.point');
    if (!pt) return;
    var key = pt.dataset.key, act = b.dataset.act, wrap = pt.querySelector('.note-wrap');
    if (act === 'star') {
      var on = !Annot.state.stars[key];
      Annot.star(key, on);
      pt.classList.toggle('starred', on);
      b.textContent = on ? '★' : '☆';
      b.setAttribute('aria-pressed', on);
      refreshSidebar();
    } else if (act === 'note-edit') {
      wrap.innerHTML = noteEditor(key);
      var ta = wrap.querySelector('textarea');
      autoGrow(ta);
      ta.focus();
    } else if (act === 'note-cancel') {
      wrap.innerHTML = noteView(key, Annot.state.notes[key] || '');
    } else if (act === 'note-save') {
      var txt = wrap.querySelector('textarea').value.slice(0, Annot.NOTE_MAX).replace(/\s+$/, '');
      var old = Annot.state.notes[key] || '';
      Annot.note(key, txt, Annot.shift(Annot.state.marks[key + '/note'], old, txt));
      wrap.innerHTML = noteView(key, txt);
    } else if (act === 'note-del') {
      if (confirm('删除这条笔记？Delete this note?')) {
        Annot.note(key, '', []);
        wrap.innerHTML = noteView(key, '');
      }
    }
  });
  main.addEventListener('input', function (e) {
    if (!e.target.classList.contains('note-input')) return;
    autoGrow(e.target);
    var c = e.target.closest('.note').querySelector('.note-count');
    c.textContent = e.target.value.length + ' / ' + Annot.NOTE_MAX;
  });
  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 600) + 'px'; }

  // Selection toolbar
  var tb = document.createElement('div');
  tb.className = 'mk-bar';
  tb.setAttribute('role', 'toolbar');
  tb.innerHTML = '<button data-k="hl" title="标黄 Highlight"><i class="sw sw-hl"></i></button>' +
    '<button data-k="r" title="红色 Red"><i class="sw sw-r"></i></button>' +
    '<button data-k="b" title="蓝色 Blue"><i class="sw sw-b"></i></button>' +
    '<button data-k="g" title="绿色 Green"><i class="sw sw-g"></i></button>' +
    '<button data-k="p" title="紫色 Purple"><i class="sw sw-p"></i></button>' +
    '<button data-k="x" title="清除标注 Clear">清除</button>';
  document.body.appendChild(tb);
  var selInfo = null;

  function offsetIn(el, node, off) {
    var r = document.createRange();
    r.selectNodeContents(el);
    r.setEnd(node, off);
    return r.toString().length;
  }
  function currentSelection() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    var r = sel.getRangeAt(0);
    var a = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode;
    var z = r.endContainer.nodeType === 1 ? r.endContainer : r.endContainer.parentNode;
    var ea = a.closest && a.closest('.mk'), ez = z.closest && z.closest('.mk');
    if (!ea || ea !== ez || !main.contains(ea)) return null;
    var s = offsetIn(ea, r.startContainer, r.startOffset), en = offsetIn(ea, r.endContainer, r.endOffset);
    if (en <= s) return null;
    return { el: ea, blk: ea.dataset.blk, s: s, e: en, rect: r.getBoundingClientRect() };
  }
  function hideBar() { tb.classList.remove('on'); selInfo = null; }
  function showBar() {
    var info = currentSelection();
    if (!info) { hideBar(); return; }
    selInfo = info;
    tb.classList.add('on');
    var w = tb.offsetWidth, hgt = tb.offsetHeight, r = info.rect;
    var x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    // Prefer opening below the selection so it doesn't collide with the
    // mobile OS's own selection popup, which appears above the selection.
    var y = r.bottom + 10;
    if (y + hgt > window.innerHeight - 8) y = r.top - hgt - 10;
    tb.style.left = x + 'px';
    tb.style.top = y + 'px';
  }
  var selTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(showBar, 180);
  });
  window.addEventListener('scroll', function () { if (selInfo) showBar(); }, { passive: true });
  tb.addEventListener('mousedown', function (e) { e.preventDefault(); });
  tb.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !selInfo) return;
    var info = selInfo, cur = Annot.state.marks[info.blk];
    var next = b.dataset.k === 'x' ? Annot.clearMark(cur, info.s, info.e) : Annot.addMark(cur, info.s, info.e, b.dataset.k);
    Annot.marks(info.blk, next);
    info.el.innerHTML = Annot.render(info.el.textContent, next);
    window.getSelection().removeAllRanges();
    hideBar();
  });

  // Sync status + token dialog
  var syncBtn = document.getElementById('syncBtn');
  var SYNC_TXT = {
    loading: ['⟳', '正在读取云端标注 Loading shared annotations'],
    syncing: ['⟳', '正在同步 Syncing'],
    synced: ['✓', '已与云端同步 Synced'],
    pending: ['…', '等待同步 Waiting to sync'],
    local: ['!', '仅保存在本机：点此登录后即可同步到所有设备 Saved on this device only — click to connect'],
    error: ['!', '同步失败 Sync failed']
  };
  function paintSync() {
    var s = Annot.status, t = SYNC_TXT[s] || SYNC_TXT.synced;
    syncBtn.dataset.s = s;
    syncBtn.querySelector('.sync-ic').textContent = t[0];
    var n = Annot.pendingCount();
    syncBtn.querySelector('.sync-n').textContent = (s === 'local' || s === 'error' || s === 'pending') && n ? n : '';
    syncBtn.title = t[1] + (Annot.detail ? ' · ' + Annot.detail : '') + (n ? ' · ' + n + ' 项未同步' : '');
  }
  var dlg = document.getElementById('syncDlg');
  syncBtn.addEventListener('click', function () {
    document.getElementById('tokInput').value = '';
    document.getElementById('tokState').textContent = Annot.hasToken() ? '本设备已连接 GitHub。This device is connected.' : '本设备尚未连接，标注只保存在本机。Not connected — changes stay on this device.';
    document.getElementById('dlgStatus').textContent = (SYNC_TXT[Annot.status] || [])[1] + (Annot.detail ? ' · ' + Annot.detail : '') + (Annot.pendingCount() ? ' · ' + Annot.pendingCount() + ' 项未同步' : '');
    document.getElementById('tokLogout').style.display = Annot.hasToken() ? '' : 'none';
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  });
  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dlg]');
    if (e.target === dlg || (b && b.dataset.dlg === 'close')) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); return; }
    if (!b) return;
    if (b.dataset.dlg === 'save') {
      var v = document.getElementById('tokInput').value.trim();
      if (!v) return;
      Annot.setToken(v);
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    } else if (b.dataset.dlg === 'logout') {
      Annot.setToken('');
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    } else if (b.dataset.dlg === 'refresh') {
      Annot.refresh(true);
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    }
  });

  var lastSig = '';
  function sig() {
    var s = Annot.state;
    return JSON.stringify([s.stars, s.marks, s.notes]);
  }
  function refreshSidebar() {
    if (!toc) return;
    var id = currentChapterId();
    renderSidebar(id, id ? cache[id] : null);
  }
  function currentChapterId() {
    var id = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[0] || '');
    return flat.some(function (c) { return c.id === id; }) ? id : null;
  }
  Annot.onChange(function () {
    paintSync();
    var s = sig();
    if (s === lastSig) return;
    lastSig = s;
    refreshSidebar();
    // Remote data changed: re-render chapter unless the user is mid-edit or mid-selection
    if (main.querySelector('.note.editing') || selInfo || !toc) return;
    var id = currentChapterId();
    if (id && cache[id] && main.dataset.key && main.dataset.key.indexOf('|practice') < 0) {
      var y = window.scrollY;
      var meta = flat.filter(function (c) { return c.id === id; })[0];
      renderChapter(meta, cache[id], main.dataset.key.split('|')[1]);
      window.scrollTo(0, y);
    }
  });
  lastSig = sig();
  paintSync();

  function draftKey(meta, i) { return 'gpp-draft:' + meta.id + ':' + i; }

  function renderExercise(meta, ch, e, i) {
    var scn = e.type === 'scenario';
    var h = '<div class="ex' + (scn ? ' ex-scn' : '') + '" data-i="' + i + '" data-kind="' + (scn ? 'scenario' : 'basic') + '"><div class="ex-meta"><span class="type">' + TYPE_LABEL[e.type] + '</span><span>Q' + (i + 1) +
      '</span><span>考点 · ' + esc(sectionRef(meta, ch, e.ref)) + '</span></div>';
    if (scn) {
      var draft = store(draftKey(meta, i)) || '';
      return h + '<h3 class="scn-title">' + esc(e.title) + '</h3><p class="ex-q scn-q">' + esc(e.q) + '</p>' +
        '<textarea class="open-area scn-area" placeholder="写下你的设计：需要哪些类/数据结构？它们如何协作？有什么取舍？（中英文皆可，草稿自动保存在本机）Sketch your design — classes, data, interactions, trade-offs.">' + esc(draft) + '</textarea>' +
        '<button class="btn primary reveal">查看参考设计 Reveal reference design</button><div class="fb"></div></div>';
    }
    var q = esc(e.q);
    if (e.type === 'fill') q = q.replace(/_{3,}/g, '<span class="ex-blank"></span>');
    h += '<p class="ex-q">' + q + '</p>';
    if (e.type === 'choice') {
      h += '<div class="opts">';
      e.options.forEach(function (o, k) {
        h += '<button class="opt" data-k="' + k + '"><span class="k">' + 'ABCDEFG'[k] + '</span><span>' + esc(o) + '</span></button>';
      });
      h += '</div>';
    } else if (e.type === 'truefalse') {
      h += '<div class="tf"><button class="opt" data-k="true"><span>✓ 正确 True</span></button><button class="opt" data-k="false"><span>✗ 错误 False</span></button></div>';
    } else if (e.type === 'fill') {
      h += '<form class="fill-row"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="输入答案 Type your answer"><button class="btn primary" type="submit">提交 Check</button></form>';
    } else {
      h += '<textarea class="open-area" placeholder="先用自己的话作答（中英文皆可），再查看参考答案 Write your answer, then reveal the reference."></textarea><button class="btn primary reveal">查看参考答案 Reveal</button>';
    }
    return h + '<div class="fb"></div></div>';
  }

  function norm(s) { return String(s).toLowerCase().replace(/[\s\u3000"“”'‘’`()（）.。,，;；:：!！?？\-_]/g, ''); }

  function bindExercises(meta, ch) {
    var results = {};
    var scoreEl = document.getElementById('exScore');
    function update() {
      var n = Object.keys(results).length, ok = 0;
      for (var k in results) if (results[k]) ok++;
      var gradable = ch.exercises.filter(function (e) { return e.type !== 'open' && e.type !== 'scenario'; }).length;
      var nScn = ch.exercises.length - ch.exercises.filter(function (e) { return e.type !== 'scenario'; }).length;
      var scnDone = main.querySelectorAll('.ex-scn .reveal:disabled').length;
      scoreEl.textContent = '已作答 ' + n + ' / ' + ch.exercises.length + ' · 客观题得分 ' + ok + ' / ' + gradable +
        (nScn ? ' · 场景设计 ' + scnDone + ' / ' + nScn : '');
      var p = getProgress();
      p[meta.id] = p[meta.id] || {};
      if (n >= gradable) { p[meta.id].score = ok; p[meta.id].total = gradable; saveProgress(p); }
    }
    function feedback(box, e, correct) {
      var fb = box.querySelector('.fb');
      var ans = '';
      if (e.type === 'fill') ans = '<div class="ans">参考答案 Answer：<b style="display:inline">' + esc(e.answer[0]) + '</b></div>';
      if (e.type === 'open') ans = '<div class="ans">' + esc(e.answer) + '</div>';
      var head = e.type === 'open' ? '参考答案 Reference' : (correct ? '✓ 回答正确 Correct' : '✗ 回答错误 Not quite');
      fb.innerHTML = '<div class="feedback ' + (e.type === 'open' ? '' : correct ? 'ok' : 'no') + '"><b>' + head + '</b>' + ans + '<div>' + esc(e.explain) + '</div></div>';
    }
    main.querySelectorAll('.ex').forEach(function (box) {
      var i = +box.dataset.i, e = ch.exercises[i];
      if (e.type === 'choice' || e.type === 'truefalse') {
        box.addEventListener('click', function (ev) {
          var b = ev.target.closest('.opt');
          if (!b || b.disabled) return;
          var pick = e.type === 'choice' ? +b.dataset.k : b.dataset.k === 'true';
          var correct = pick === e.answer;
          box.querySelectorAll('.opt').forEach(function (o) {
            o.disabled = true;
            var v = e.type === 'choice' ? +o.dataset.k : o.dataset.k === 'true';
            if (v === e.answer) o.classList.add('right');
          });
          if (!correct) b.classList.add('wrong');
          results[i] = correct; feedback(box, e, correct); update();
        });
      } else if (e.type === 'fill') {
        box.querySelector('form').addEventListener('submit', function (ev) {
          ev.preventDefault();
          var inp = box.querySelector('input');
          if (!inp.value.trim() || i in results) return;
          var v = norm(inp.value);
          var correct = e.answer.some(function (a) { return norm(a) === v; });
          inp.classList.add(correct ? 'right' : 'wrong'); inp.readOnly = true;
          box.querySelector('button').disabled = true;
          results[i] = correct; feedback(box, e, correct); update();
        });
      } else if (e.type === 'scenario') {
        var ta = box.querySelector('textarea');
        var saveT = null;
        ta.addEventListener('input', function () {
          clearTimeout(saveT);
          saveT = setTimeout(function () { store(draftKey(meta, i), ta.value); }, 400);
        });
        box.querySelector('.reveal').addEventListener('click', function (ev) {
          ev.target.disabled = true;
          var fb = box.querySelector('.fb');
          fb.innerHTML = '<div class="feedback scn-fb"><b>参考设计 Reference design</b><div class="ans scn-ans">' + esc(e.answer) + '</div>' +
            (e.code ? '<pre><code>' + highlight(e.code) + '</code></pre>' : '') +
            '<div class="scn-check"><b>自查要点 Self-check</b>' +
            e.checklist.map(function (c, k) {
              return '<label><input type="checkbox" data-k="' + k + '"><span>' + esc(c) + '</span></label>';
            }).join('') + '<div class="scn-score"></div></div>' +
            '<div class="scn-explain">' + esc(e.explain) + '</div></div>';
          var boxes = fb.querySelectorAll('input[type=checkbox]');
          var sc = fb.querySelector('.scn-score');
          function tally() {
            var hit = 0; boxes.forEach(function (b) { if (b.checked) hit++; });
            sc.textContent = '覆盖要点 Covered ' + hit + ' / ' + boxes.length;
          }
          fb.addEventListener('change', tally);
          tally();
          update();
        });
      } else {
        box.querySelector('.reveal').addEventListener('click', function (ev) {
          ev.target.disabled = true; feedback(box, e, null);
        });
      }
    });
    var filt = main.querySelector('.ex-filter');
    if (filt) filt.addEventListener('click', function (ev) {
      var b = ev.target.closest('button');
      if (!b) return;
      filt.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      main.querySelectorAll('.ex').forEach(function (x) {
        x.style.display = b.dataset.f === 'all' || x.dataset.kind === b.dataset.f ? '' : 'none';
      });
    });
    document.getElementById('exReset').addEventListener('click', function () {
      ch.exercises.forEach(function (e, i) { if (e.type === 'scenario') store(draftKey(meta, i), ''); });
      renderChapter(meta, ch, 'practice');
    });
    update();
  }

  function markRead(id) {
    var p = getProgress();
    p[id] = p[id] || {};
    if (!p[id].read) { p[id].read = true; saveProgress(p); }
  }

  function route() {
    setNav(false);
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var id = decodeURIComponent(parts[0] || '');
    var meta = flat.filter(function (c) { return c.id === id; })[0];
    if (!meta) {
      main.dataset.key = '';
      renderSidebar(null);
      renderHome();
      document.title = '游戏编程模式 · Game Programming Patterns 学习站';
      window.scrollTo(0, 0);
      return;
    }
    var sub = parts[1] || '';
    var view = sub === 'practice' || sub === 'starred' ? sub : 'learn';
    if (main.dataset.key !== id + '|' + view) main.innerHTML = '<div class="loading">加载中 Loading…</div>';
    loadChapter(id).then(function (ch) {
      var key = id + '|' + view;
      var same = main.dataset.key === key;
      if (!same) renderChapter(meta, ch, view);
      main.dataset.key = key;
      renderSidebar(id, ch);
      document.title = ch.title.zh + ' ' + ch.title.en + ' · 游戏编程模式';
      var target = sub && view === 'learn' ? document.getElementById('s-' + sub) : null;
      if (target) target.scrollIntoView({ block: 'start' });
      else if (!same) window.scrollTo(0, 0);
    }).catch(function () {
      main.innerHTML = '<div class="error">本章内容加载失败 Failed to load this chapter.</div>';
      main.dataset.key = '';
    });
  }

  fetch('data/toc.json').then(function (r) { return r.json(); }).then(function (j) {
    toc = j;
    toc.parts.forEach(function (p) { p.chapters.forEach(function (c) { c.part = p; flat.push(c); }); });
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () {
    main.innerHTML = '<div class="error">目录加载失败 Failed to load contents.</div>';
  });
})();
