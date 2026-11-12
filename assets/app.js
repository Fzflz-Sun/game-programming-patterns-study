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
        h += '<a class="toc-ch' + (on ? ' active' : '') + '" href="#/' + c.id + '"><span class="n">' + (c.num === 0 ? '·' : c.num) +
          '</span><span class="t">' + esc(c.zh) + '<small>' + esc(c.en) + '</small></span>' +
          (prog[c.id] && prog[c.id].read ? '<span class="done" title="已学完">✓</span>' : '') + '</a>';
        if (on && chapter) {
          h += '<div class="toc-secs">';
          chapter.sections.forEach(function (s) {
            h += '<a href="#/' + c.id + '/' + s.num + '"><span class="sn">' + esc(s.num) + '</span>' + esc(s.title.zh) + '</a>';
          });
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
        h += '<a class="card" href="#/' + c.id + '"><div class="cn">' + chapLabel(c) + '</div><div class="cz">' + esc(c.zh) +
          '</div><div class="ce">' + esc(c.en) + '</div><div class="cm"><span>' +
          (pr.score != null ? '练习 ' + pr.score + '/' + pr.total : '未练习') + '</span>' +
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

  var TYPE_LABEL = { choice: '单选 Choice', truefalse: '判断 True/False', fill: '填空 Fill-in', open: '简答 Open' };

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
      '<div class="tabs" role="tablist"><button data-v="learn" class="' + (view === 'learn' ? 'on' : '') + '">知识点 Learn<span class="count">' + nPts + '</span></button>' +
      '<button data-v="practice" class="' + (view === 'practice' ? 'on' : '') + '">练习 Practice<span class="count">' + ch.exercises.length + '</span></button></div>';

    if (view === 'practice') {
      h += '<div class="ex-head"><span class="ex-score" id="exScore"></span><button class="btn" id="exReset">重做 Reset</button></div>';
      ch.exercises.forEach(function (e, i) { h += renderExercise(meta, ch, e, i); });
    } else {
      ch.sections.forEach(function (s) {
        h += '<section class="section" id="s-' + esc(s.num) + '"><h2 class="sec-title"><span class="sn">§' + esc(s.num) +
          '</span><span class="zh-t">' + esc(s.title.zh) + '</span><span class="en-t">' + esc(s.title.en) + '</span></h2>';
        s.points.forEach(function (p) {
          h += '<div class="point"><h3><span class="zh">' + esc(p.title.zh) + '</span><span class="en">' + esc(p.title.en) + '</span></h3>' +
            '<div class="src">出处 Source <span class="tag">' + (meta.num === 0 ? 'Introduction' : 'Ch.' + meta.num + ' ' + esc(ch.title.en)) +
            '</span>›<span class="tag">§' + esc(s.num) + ' ' + esc(s.title.en) + '</span>' +
            (p.subsection ? '›<span class="tag">' + esc(p.subsection.en) + '</span>' : '') + '</div>' +
            '<div class="body">' + bi(p.body) + '</div>' +
            (p.code ? '<pre><code>' + highlight(p.code) + '</code></pre>' : '') + '</div>';
        });
        h += '</section>';
      });
      if (ch.terms && ch.terms.length) {
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

    main.querySelector('.tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) location.hash = '#/' + meta.id + (b.dataset.v === 'practice' ? '/practice' : '');
    });
    if (view === 'practice') bindExercises(meta, ch);
    else markRead(meta.id);
  }

  function renderExercise(meta, ch, e, i) {
    var h = '<div class="ex" data-i="' + i + '"><div class="ex-meta"><span class="type">' + TYPE_LABEL[e.type] + '</span><span>Q' + (i + 1) +
      '</span><span>考点 · ' + esc(sectionRef(meta, ch, e.ref)) + '</span></div>';
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
      var gradable = ch.exercises.filter(function (e) { return e.type !== 'open'; }).length;
      scoreEl.textContent = '已作答 ' + n + ' / ' + ch.exercises.length + ' · 客观题得分 ' + ok + ' / ' + gradable;
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
      } else {
        box.querySelector('.reveal').addEventListener('click', function (ev) {
          ev.target.disabled = true; feedback(box, e, null);
        });
      }
    });
    document.getElementById('exReset').addEventListener('click', function () { renderChapter(meta, ch, 'practice'); });
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
      renderSidebar(null);
      renderHome();
      document.title = '游戏编程模式 · Game Programming Patterns 学习站';
      window.scrollTo(0, 0);
      return;
    }
    var sub = parts[1] || '';
    var view = sub === 'practice' ? 'practice' : 'learn';
    main.innerHTML = '<div class="loading">加载中 Loading…</div>';
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
