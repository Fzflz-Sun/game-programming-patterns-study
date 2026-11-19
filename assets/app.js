(function () {
  'use strict';

  /* ---------------------------------------------------------------- state */
  var LANGS = ['zh', 'en', 'es'];
  var LANG_NAME = { zh: '中', en: 'EN', es: 'ES' };
  var LANG_HTML = { zh: 'zh-CN', en: 'en', es: 'es' };
  var root = document.documentElement;
  var layout = document.getElementById('layout');
  var main = document.getElementById('main');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var langSeg = document.getElementById('langSeg');
  var themeBtn = document.getElementById('themeBtn');
  var sidebarBtn = document.getElementById('sidebarBtn');
  var syncBtn = document.getElementById('syncBtn');

  var book = null;
  var toc = null;
  var flat = [];
  var cache = {};
  var chapterStats = {};
  var activeLangs = readLangs();
  var ns = 'bookleaf';
  var currentRoute = { id: '', view: '', point: null, section: '' };
  var localWriteUntil = 0;
  var lastSig = '';
  var menuOpen = false;
  var sidebarCollapsed = false;

  var UI = {
    zh: {
      contents: '目录', home: '首页', learn: '知识点', practice: '练习',
      progress: '学习进度', starredOnly: '只看星标', showAll: '显示全部',
      allPoints: '全部知识点', starredPoints: '星标知识点', noStarred: '本章还没有星标知识点。',
      points: '个知识点', exercises: '道练习', chapters: '章', parts: '篇',
      source: '出处', keyTerms: '关键术语', star: '加星标', unstar: '取消星标',
      note: '笔记', addNote: '添加笔记', edit: '编辑', del: '删除', save: '保存', cancel: '取消',
      notePlaceholder: '写下你的理解（最多 10000 字）', chars: '字',
      sync: '同步', syncTitle: 'GitHub 云同步', syncIntro: '星标、画线和笔记保存在本 GitHub 仓库中，所有设备共享。读取公开数据不需要令牌；写入需要仅限该仓库 Contents 读写的 fine-grained token。',
      token: 'GitHub token', connect: '连接', disconnect: '断开本设备', refresh: '立即刷新', close: '关闭',
      localOnly: '仅保存在本机', synced: '已同步', syncing: '正在同步', pending: '等待同步', loading: '正在读取云端标注', syncError: '同步失败',
      connected: '本设备已连接 GitHub。', notConnected: '本设备尚未连接，改动暂存在本机。',
      reveal: '查看参考答案', revealDesign: '查看参考设计', correct: '回答正确', wrong: '再想一想',
      reference: '参考答案', designReference: '参考设计与思路', selfCheck: '自查要点', covered: '已覆盖',
      true: '正确', false: '错误', submit: '提交', typeAnswer: '输入答案', writeFirst: '先写下你的作答，再展开参考答案。',
      writeDesign: '写下你的设计：类、数据结构、交互与取舍。草稿自动保存在本机。',
      reset: '重做', allEx: '全部', basics: '基础题', scenarios: '场景设计', filter: '题型',
      noAnswer: '参考', exRef: '考点', q: '第', readDone: '已学完', prev: '上一章', next: '下一章',
      desc: '以原书目录为骨骼，把书中的知识点、练习与自己的批注重组为一座可以反复练习的学习站。',
      languageHint: '至少保留一种语言', expand: '展开目录', collapse: '收起目录', menu: '目录',
      theme: '切换夜间模式', loaded: '内容加载失败', tocFail: '目录加载失败',
      cloudBranch: '云端文件', stars: '星标', noteSaved: '笔记已保存', marked: '已标注',
      starFilterHint: '本章只看星标', updated: '刚刚同步'
    },
    en: {
      contents: 'Contents', home: 'Home', learn: 'Concepts', practice: 'Practice',
      progress: 'Progress', starredOnly: 'Starred only', showAll: 'Show all',
      allPoints: 'All concepts', starredPoints: 'Starred concepts', noStarred: 'No starred concepts in this chapter yet.',
      points: 'concepts', exercises: 'exercises', chapters: 'chapters', parts: 'parts',
      source: 'Source', keyTerms: 'Key terms', star: 'Star', unstar: 'Unstar',
      note: 'Note', addNote: 'Add a note', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel',
      notePlaceholder: 'Write your understanding (10,000 characters max)', chars: 'characters',
      sync: 'Sync', syncTitle: 'GitHub cloud sync', syncIntro: 'Stars, ink and notes live in this GitHub repository and are shared by every device. Reading is public; writing needs a fine-grained token with Contents read/write on this repository only.',
      token: 'GitHub token', connect: 'Connect', disconnect: 'Disconnect this device', refresh: 'Refresh now', close: 'Close',
      localOnly: 'On this device only', synced: 'Synced', syncing: 'Syncing', pending: 'Waiting to sync', loading: 'Loading shared annotations', syncError: 'Sync failed',
      connected: 'This device is connected to GitHub.', notConnected: 'Not connected — changes stay on this device for now.',
      reveal: 'Reveal answer', revealDesign: 'Reveal reference design', correct: 'Correct', wrong: 'Not quite',
      reference: 'Reference answer', designReference: 'Reference design & rationale', selfCheck: 'Self-check', covered: 'Covered',
      true: 'True', false: 'False', submit: 'Check', typeAnswer: 'Type your answer', writeFirst: 'Write your answer, then reveal the reference.',
      writeDesign: 'Sketch your design: classes, data, interactions and trade-offs. Drafts save on this device.',
      reset: 'Reset', allEx: 'All', basics: 'Basics', scenarios: 'Design', filter: 'Type',
      noAnswer: 'Reference', exRef: 'Covers', q: 'Q', readDone: 'Read', prev: 'Previous', next: 'Next',
      desc: 'The book’s own outline, its concepts and applied practice, combined with your ink and notes — a quiet place to learn by doing.',
      languageHint: 'Keep at least one language', expand: 'Expand contents', collapse: 'Collapse contents', menu: 'Contents',
      theme: 'Toggle dark mode', loaded: 'Failed to load this chapter', tocFail: 'Failed to load the contents',
      cloudBranch: 'Cloud file', stars: 'Stars', noteSaved: 'Note saved', marked: 'Marked',
      starFilterHint: 'Showing starred concepts in this chapter', updated: 'Synced just now'
    },
    es: {
      contents: 'Índice', home: 'Inicio', learn: 'Conceptos', practice: 'Práctica',
      progress: 'Progreso', starredOnly: 'Solo destacados', showAll: 'Mostrar todo',
      allPoints: 'Todos los conceptos', starredPoints: 'Conceptos destacados', noStarred: 'Aún no hay conceptos destacados en este capítulo.',
      points: 'conceptos', exercises: 'ejercicios', chapters: 'capítulos', parts: 'partes',
      source: 'Fuente', keyTerms: 'Términos clave', star: 'Destacar', unstar: 'Quitar destacado',
      note: 'Nota', addNote: 'Añadir nota', edit: 'Editar', del: 'Eliminar', save: 'Guardar', cancel: 'Cancelar',
      notePlaceholder: 'Escribe lo que has entendido (máximo 10.000 caracteres)', chars: 'caracteres',
      sync: 'Sincronizar', syncTitle: 'Sincronización con GitHub', syncIntro: 'Las estrellas, la tinta y las notas se guardan en este repositorio de GitHub y se comparten entre dispositivos. La lectura es pública; para escribir necesitas un token fine-grained con permiso de lectura y escritura de Contents solo en este repositorio.',
      token: 'Token de GitHub', connect: 'Conectar', disconnect: 'Desconectar este dispositivo', refresh: 'Actualizar', close: 'Cerrar',
      localOnly: 'Solo en este dispositivo', synced: 'Sincronizado', syncing: 'Sincronizando', pending: 'Pendiente', loading: 'Cargando anotaciones', syncError: 'Error de sincronización',
      connected: 'Este dispositivo está conectado a GitHub.', notConnected: 'Sin conexión: los cambios se guardan solo en este dispositivo.',
      reveal: 'Ver respuesta', revealDesign: 'Ver diseño de referencia', correct: 'Correcto', wrong: 'Casi',
      reference: 'Respuesta de referencia', designReference: 'Diseño y razonamiento', selfCheck: 'Autoevaluación', covered: 'Cubierto',
      true: 'Verdadero', false: 'Falso', submit: 'Comprobar', typeAnswer: 'Escribe tu respuesta', writeFirst: 'Escribe tu respuesta y después consulta la referencia.',
      writeDesign: 'Esboza tu diseño: clases, datos, interacciones y compromisos. El borrador se guarda en este dispositivo.',
      reset: 'Reintentar', allEx: 'Todo', basics: 'Básicos', scenarios: 'Diseño', filter: 'Tipo',
      noAnswer: 'Referencia', exRef: 'Cubre', q: 'P', readDone: 'Leído', prev: 'Anterior', next: 'Siguiente',
      desc: 'El índice del libro, sus conceptos y práctica aplicada, junto con tus trazos y notas: un lugar tranquilo para aprender haciendo.',
      languageHint: 'Mantén al menos un idioma', expand: 'Abrir índice', collapse: 'Cerrar índice', menu: 'Índice',
      theme: 'Cambiar modo nocturno', loaded: 'No se pudo cargar el capítulo', tocFail: 'No se pudo cargar el índice',
      cloudBranch: 'Archivo en la nube', stars: 'Destacados', noteSaved: 'Nota guardada', marked: 'Marcado',
      starFilterHint: 'Mostrando solo los conceptos destacados', updated: 'Sincronizado ahora'
    }
  };

  function activeContentLangs() {
    var a = LANGS.filter(function (k) { return activeLangs.indexOf(k) >= 0; });
    return a.length ? a : ['zh'];
  }
  function uiLang() { return activeContentLangs()[0]; }
  function t(key) { return (UI[uiLang()] && UI[uiLang()][key]) || UI.en[key] || key; }
  function readLangs() {
    try {
      var v = JSON.parse(localStorage.getItem('bookleaf-langs') || 'null');
      if (Array.isArray(v)) {
        v = v.filter(function (x) { return LANGS.indexOf(x) >= 0; });
        if (v.length) return LANGS.filter(function (k) { return v.indexOf(k) >= 0; });
      }
    } catch (e) {}
    return ['zh', 'en'];
  }
  function saveLangs() {
    try { localStorage.setItem('bookleaf-langs', JSON.stringify(activeLangs)); } catch (e) {}
  }
  function lsGet(k) { try { return localStorage.getItem(ns + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(ns + k, v); } catch (e) {} }

  /* ------------------------------------------------------------- localized */
  function asLoc(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return { zh: v.zh || v.en || '', en: v.en || v.zh || '', es: v.es || v.en || v.zh || '' };
    }
    var s = typeof v === 'string' ? v : '';
    return { zh: s, en: s, es: s };
  }
  function pick(v) {
    var o = asLoc(v), lang = uiLang();
    return o[lang] || o.en || o.zh || o.es || '';
  }
  function titleOf(meta) {
    if (!meta) return { zh: '', en: '', es: '' };
    if (meta.title && typeof meta.title === 'object') return asLoc(meta.title);
    return asLoc({ zh: meta.zh, en: meta.en, es: meta.es });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function langTag(k) { return '<span class="lang-tag">' + LANG_NAME[k] + '</span>'; }
  function stack(o, tag, cls) {
    var langs = activeContentLangs(), single = langs.length === 1;
    return '<div class="lset' + (single ? ' single' : '') + (cls ? ' ' + cls : '') + '" data-langs="' + langs.join(' ') + '">' +
      langs.map(function (k) {
        var html = o[k] || '';
        return '<' + tag + ' class="lg lg-' + k + '" lang="' + LANG_HTML[k] + '" data-lang="' + LANG_NAME[k] + '">' + esc(html) + '</' + tag + '>';
      }).join('') + '</div>';
  }
  function stackMarked(o, base, tag, cls) {
    var langs = activeContentLangs(), single = langs.length === 1;
    return '<div class="lset' + (single ? ' single' : '') + (cls ? ' ' + cls : '') + '" data-langs="' + langs.join(' ') + '">' +
      langs.map(function (k) {
        return '<' + tag + ' class="lg lg-' + k + '" lang="' + LANG_HTML[k] + '" data-lang="' + LANG_NAME[k] + '">' + mk(base + '.' + k, o[k] || '') + '</' + tag + '>';
      }).join('') + '</div>';
  }
  function stackInline(o, cls) {
    var langs = activeContentLangs();
    return '<span class="lset inline' + (langs.length === 1 ? ' single' : '') + (cls ? ' ' + cls : '') + '">' +
      langs.map(function (k) {
        return '<span class="lg lg-' + k + '" lang="' + LANG_HTML[k] + '" data-lang="' + LANG_NAME[k] + '">' + esc(o[k] || '') + '</span>';
      }).join('') + '</span>';
  }
  function chipLabel(o) {
    var langs = activeContentLangs();
    return '<span class="lang-tag">' + langs.map(function (k) { return LANG_NAME[k]; }).join(' · ') + '</span>';
  }

  /* -------------------------------------------------------------- manifest */
  function normalizeManifest(j) {
    toc = j;
    book = j.book || {};
    book.title = titleOf({ title: book.title, zh: book.zh, en: book.en, es: book.es });
    if (!book.subtitle) book.subtitle = { zh: '', en: '', es: '' };
    book.subtitle = asLoc(book.subtitle);
    if (!book.description) book.description = book.subtitle;
    book.description = asLoc(book.description);
    book.id = book.id || 'book';
    ns = 'bookleaf:' + book.id;
    flat = [];
    toc.parts.forEach(function (p) {
      p.title = titleOf({ title: p.title, zh: p.zh, en: p.en, es: p.es });
      p.chapters.forEach(function (c) {
        c.title = titleOf(c);
        c.part = p;
        flat.push(c);
      });
    });
    document.title = pick(book.title) + ' · Bookleaf';
    var zhTitle = document.getElementById('brandTitle');
    var subTitle = document.getElementById('brandSub');
    if (zhTitle) zhTitle.textContent = pick(book.title);
    if (subTitle) subTitle.textContent = pick(book.subtitle);
    document.querySelector('meta[name="description"]').setAttribute('content', pick(book.description));

    var a = book.annotations || {};
    var repo = book.repo || {};
    if (repo.owner && repo.name) {
      window.BookleafAnnot.configure({
        owner: repo.owner,
        repo: repo.name,
        branch: a.branch || repo.branch || 'main',
        path: a.path || 'annotations.json',
        bookId: book.id
      });
    }
    lastSig = sig();
    paintSync();
  }

  /* --------------------------------------------------------------- helpers */
  function chapterTitle(meta) { return titleOf(meta); }
  function countPoints(ch) {
    return (ch.sections || []).reduce(function (n, s) { return n + (s.points || []).length; }, 0);
  }
  function starCount(prefix) {
    var s = window.BookleafAnnot.state.stars || {}, n = 0;
    for (var k in s) { if (k.indexOf(prefix) === 0) n++; }
    return n;
  }
  function getProgress() {
    try { return JSON.parse(lsGet(':progress') || '{}') || {}; } catch (e) { return {}; }
  }
  function saveProgress(p) { lsSet(':progress', JSON.stringify(p)); }
  function sig() {
    var s = window.BookleafAnnot.state;
    return JSON.stringify([s.stars, s.marks, s.notes]);
  }

  /* ---------------------------------------------------------------- sidebar */
  function renderSidebar(activeId, chapter, view) {
    if (!toc) return;
    var prog = getProgress();
    var done = flat.filter(function (c) { return prog[c.id] && prog[c.id].read; }).length;
    var totalStars = starCount('');
    var h = '<div class="side-head"><div><div class="side-kicker">' + esc(t('contents')) + '</div>' +
      '<div class="side-book">' + esc(pick(book.title)) + '</div></div>' +
      '<button class="side-collapse" type="button" aria-label="' + esc(t('collapse')) + '" title="' + esc(t('collapse')) + '">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';
    h += '<div class="toc-progress"><div class="progress-copy"><span>' + esc(t('progress')) + '</span><span><b>' + done + '</b> / ' + flat.length + '</span></div>' +
      '<div class="bar"><i style="width:' + (flat.length ? (100 * done / flat.length) : 0) + '%"></i></div>' +
      '<div class="toc-total"><span>★ ' + totalStars + ' ' + esc(t('stars')) + '</span></div></div>';
    h += '<a class="toc-home' + (!activeId ? ' active' : '') + '" href="#/"><span class="home-glyph">⌂</span>' + esc(t('home')) + '</a>';

    toc.parts.forEach(function (p) {
      h += '<div class="toc-part"><span>Part ' + p.num + '</span><b>' + esc(pick(p.title)) + '</b></div>';
      p.chapters.forEach(function (c) {
        var on = c.id === activeId;
        var sc = starCount(c.id + '/');
        var pr = prog[c.id] || {};
        h += '<a class="toc-ch' + (on ? ' active' : '') + '" href="#/' + encodeURIComponent(c.id) + '">' +
          '<span class="n">' + (c.num === 0 ? '·' : c.num) + '</span>' +
          '<span class="t">' + esc(pick(c.title)) +
          (sc ? '<span class="star-n">★ ' + sc + '</span>' : '') +
          (pr.read ? '<span class="done" title="' + esc(t('readDone')) + '">✓</span>' : '') +
          '</span></a>';
        if (!on) return;
        var starredView = view === 'starred';
        var chapterStars = sc;
        h += '<div class="toc-sub">';
        h += '<div class="toc-actions">' +
          '<a class="toc-action' + (starredView ? ' on' : '') + '" href="#/' + encodeURIComponent(c.id) + (starredView ? '' : '/starred') + '">' +
          '<span class="action-ico">★</span>' + esc(starredView ? t('showAll') : t('starredOnly')) + (chapterStars ? ' <span class="mini-count">' + chapterStars + '</span>' : '') + '</a>' +
          '<a class="toc-action' + (view === 'practice' ? ' on' : '') + '" href="#/' + encodeURIComponent(c.id) + '/practice"><span class="action-ico">✎</span>' + esc(t('practice')) + '</a></div>';
        if (chapter) {
          (chapter.sections || []).forEach(function (s) {
            var pts = s.points || [];
            var visible = pts.map(function (p, i) { return { p: p, i: i, key: c.id + '/' + s.num + '/' + i }; })
              .filter(function (x) { return !starredView || window.BookleafAnnot.state.stars[x.key]; });
            if (starredView && !visible.length) return;
            h += '<div class="toc-sec"><div class="toc-sec-title"><span class="sn">§' + esc(s.num) + '</span>' +
              '<span class="sec-tt">' + esc(pick(s.title)) + '</span>' +
              '<span class="sec-star">' + (starCount(c.id + '/' + s.num + '/') ? '★ ' + starCount(c.id + '/' + s.num + '/') : '') + '</span></div>';
            visible.forEach(function (x) {
              var starred = !!window.BookleafAnnot.state.stars[x.key];
              h += '<a class="toc-pt' + (starred ? ' starred' : '') + '" href="#/' + encodeURIComponent(c.id) + '/p/' + encodeURIComponent(s.num) + '/' + x.i + '">' +
                '<span class="pt-dot"></span><span class="pt-title">' + esc(pick(titleOf(x.p))) + '</span>' +
                (starred ? '<span class="pt-star">★</span>' : '') + '</a>';
            });
            h += '</div>';
          });
          if (starredView && !chapterStars) {
            h += '<div class="toc-empty">' + esc(t('noStarred')) + '</div>';
          }
        }
        h += '</div>';
      });
    });
    h += '<a class="side-back" href="#/">' + esc(book.author || '') + '</a>';
    sidebar.innerHTML = h;
    var collapse = sidebar.querySelector('.side-collapse');
    if (collapse) collapse.addEventListener('click', function () { setSidebar(false); });
  }

  function setSidebar(open) {
    sidebarCollapsed = !open;
    layout.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    sidebarBtn.setAttribute('aria-expanded', String(open));
    sidebarBtn.setAttribute('aria-label', t(open ? 'collapse' : 'expand'));
    sidebarBtn.title = t(open ? 'collapse' : 'expand');
    lsSet(':sidebar-collapsed', open ? '0' : '1');
  }

  /* ------------------------------------------------------------------ home */
  function renderHome() {
    var prog = getProgress();
    var h = '<div class="content home">' +
      '<section class="hero"><div class="eyebrow">Bookleaf · 书叶</div>' +
      '<div class="hero-title">' + stack(book.title, 'h1', 'hero-stack') + '</div>' +
      (pick(book.subtitle) ? '<div class="hero-sub">' + stack(book.subtitle, 'p') + '</div>' : '') +
      '<p class="desc">' + esc(pick(book.description) || t('desc')) + '</p>' +
      '<div class="stats" id="homeStats">' +
      '<div class="stat"><b>' + toc.parts.length + '</b><span>' + esc(t('parts')) + '</span></div>' +
      '<div class="stat"><b>' + flat.length + '</b><span>' + esc(t('chapters')) + '</span></div>' +
      '<div class="stat"><b id="statPts">—</b><span>' + esc(t('points')) + '</span></div>' +
      '<div class="stat"><b id="statEx">—</b><span>' + esc(t('exercises')) + '</span></div></div></section>';

    toc.parts.forEach(function (p) {
      h += '<section class="part-block"><h2><span class="pn">Part ' + p.num + '</span>' + esc(pick(p.title)) + '</h2><div class="cards">';
      p.chapters.forEach(function (c) {
        var pr = prog[c.id] || {};
        var sc = starCount(c.id + '/');
        h += '<a class="card" href="#/' + encodeURIComponent(c.id) + '"><div class="cn">' + (c.num === 0 ? 'Introduction' : 'Chapter ' + c.num) + '</div>' +
          '<div class="cz">' + esc(pick(c.title)) + '</div><div class="ce">' + esc(asLoc(c.title).en) + '</div>' +
          '<div class="cm"><span>' + (pr.score != null ? pr.score + ' / ' + pr.total : '—') + '</span><span>' +
          (sc ? '<span class="star-n">★ ' + sc + '</span>' : '') + (pr.read ? '<span class="ok">✓</span>' : '') + '</span></div></a>';
      });
      h += '</div></section>';
    });
    h += '<p class="foot">' + esc(pick(book.title)) + (book.author ? ' · ' + esc(book.author) : '') + ' · Built with Bookleaf · 内容仅供个人学习。</p></div>';
    main.innerHTML = h;
    loadAllStats();
  }

  function loadAllStats() {
    var pending = flat.filter(function (c) { return !chapterStats[c.id]; });
    if (!pending.length) return paintStats();
    Promise.all(pending.map(function (c) {
      return loadChapter(c.id).then(function (ch) { chapterStats[c.id] = { points: countPoints(ch), exercises: (ch.exercises || []).length }; }).catch(function () {});
    })).then(paintStats);
  }
  function paintStats() {
    var pts = 0, ex = 0;
    for (var id in chapterStats) { pts += chapterStats[id].points; ex += chapterStats[id].exercises; }
    var a = document.getElementById('statPts'), b = document.getElementById('statEx');
    if (a) a.textContent = pts || '—';
    if (b) b.textContent = ex || '—';
  }

  /* --------------------------------------------------------------- chapter */
  function loadChapter(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return fetch('data/chapters/' + encodeURIComponent(id) + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (j) {
      j.title = titleOf(j);
      j.summary = asLoc(j.summary);
      (j.sections || []).forEach(function (s) {
        s.title = titleOf(s);
        (s.points || []).forEach(function (p) { p.title = titleOf(p); p.body = asLoc(p.body); p.subsection = p.subsection ? titleOf(p.subsection) : null; });
      });
      (j.terms || []).forEach(function (term) {
        if (term.term) { term.term = asLoc(term.term); }
        else if (term.en || term.zh) { term.term = asLoc({ zh: term.zh, en: term.en, es: term.es }); }
      });
      cache[id] = j;
      window.BookleafAnnot.refresh(false);
      return j;
    });
  }

  function chapterLabel(meta) {
    if (meta.num === 0) return 'Introduction';
    return 'Chapter ' + meta.num + ' · ' + pick(meta.part.title);
  }

  function renderChapter(meta, ch, view, pointKey) {
    var idx = flat.indexOf(meta);
    var prev = flat[idx - 1], next = flat[idx + 1];
    var prog = getProgress();
    var nPts = countPoints(ch);
    var starred = starCount(meta.id + '/');
    var h = '<article class="content chapter">' +
      '<header class="ch-head"><div class="eyebrow">' + esc(chapterLabel(meta)) + '</div>' +
      '<div class="ch-title-wrap">' + stack(ch.title, 'h1', 'ch-title') + '</div>' +
      '<div class="ch-meta"><span>' + esc(pick(meta.part.title)) + '</span><span>·</span><span>' + nPts + ' ' + esc(t('points')) + '</span>' +
      (starred ? '<span>★ ' + starred + '</span>' : '') + (prog[meta.id] && prog[meta.id].read ? '<span class="ok">✓ ' + esc(t('readDone')) + '</span>' : '') + '</div></header>' +
      '<div class="lead">' + stack(ch.summary, 'p') + '</div>' +
      '<div class="tabs" role="tablist">' +
      '<a class="' + (view !== 'practice' ? 'on' : '') + '" href="#/' + encodeURIComponent(meta.id) + '">' + esc(t('learn')) + '<span class="count">' + nPts + '</span></a>' +
      '<a class="' + (view === 'practice' ? 'on' : '') + '" href="#/' + encodeURIComponent(meta.id) + '/practice">' + esc(t('practice')) + '<span class="count">' + (ch.exercises || []).length + '</span></a></div>';

    if (view === 'practice') h += renderPractice(meta, ch);
    else h += renderLearn(meta, ch, view, pointKey);

    h += '<nav class="pager">' +
      (prev ? '<a class="prev" href="#/' + encodeURIComponent(prev.id) + '"><small>← ' + esc(t('prev')) + '</small>' + esc(pick(prev.title)) + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="#/' + encodeURIComponent(next.id) + '"><small>' + esc(t('next')) + ' →</small>' + esc(pick(next.title)) + '</a>' : '') +
      '</nav></article>';
    main.innerHTML = h;

    main.querySelectorAll('.tabs a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); location.hash = a.getAttribute('href'); });
    });
    if (view === 'practice') bindPractice(meta, ch);
    else {
      markRead(meta.id);
      if (pointKey) {
        var target = document.getElementById(pointKey);
        if (target) { setTimeout(function () { target.scrollIntoView({ block: 'start', behavior: 'smooth' }); target.classList.add('flash'); setTimeout(function () { target.classList.remove('flash'); }, 1200); }, 40); }
      }
    }
    bindPointActions(meta, ch);
  }

  function renderLearn(meta, ch, view, pointKey) {
    var starredView = view === 'starred';
    var A = window.BookleafAnnot.state;
    var h = '';
    if (starredView) {
      h += '<div class="filter-bar"><span>★ ' + esc(t('starFilterHint')) + '</span><a href="#/' + encodeURIComponent(meta.id) + '">' + esc(t('showAll')) + '</a></div>';
    }
    (ch.sections || []).forEach(function (s) {
      var pts = (s.points || []).map(function (p, i) { return { p: p, i: i, key: meta.id + '/' + s.num + '/' + i }; })
        .filter(function (x) { return !starredView || A.stars[x.key]; });
      if (!pts.length) return;
      h += '<section class="section" id="s-' + esc(s.num) + '"><h2 class="sec-title"><span class="sn">§' + esc(s.num) + '</span>' +
        stack(s.title, 'div', 'sec-lset') + '</h2>';
      pts.forEach(function (x) {
        var p = x.p, key = x.key, starred = !!A.stars[key], note = A.notes[key] || '';
        h += '<div class="point' + (starred ? ' starred' : '') + '" id="point-' + esc(key.replace(/[\/.]/g, '-')) + '" data-key="' + esc(key) + '">' +
          '<div class="pt-tools"><button class="star-btn" type="button" data-act="star" aria-pressed="' + starred + '" aria-label="' + esc(t(starred ? 'unstar' : 'star')) + '" title="' + esc(t(starred ? 'unstar' : 'star')) + '">' + (starred ? '★' : '☆') + '</button></div>' +
          '<div class="pt-title-mark">' + stackMarked(p.title, key + '/t', 'h3', 'pt-title') + '</div>' +
          '<div class="src"><span>' + esc(t('source')) + '</span>' + chipLabel(p.subsection || s.title) +
          '<span class="tag">' + (meta.num === 0 ? 'Introduction' : 'Ch. ' + meta.num) + '</span><span>›</span>' +
          '<span class="tag">§' + esc(s.num) + '</span>' + (p.subsection ? '<span>›</span><span class="tag">' + esc(pick(p.subsection)) + '</span>' : '') + '</div>' +
          '<div class="body">' + stackMarked(p.body, key + '/b', 'p') + '</div>' +
          (p.code ? '<pre><code><span class="mk code-mk" data-blk="' + esc(key + '/code') + '">' + highlight(p.code) + '</span></code></pre>' : '') +
          '<div class="note-wrap" data-note-key="' + esc(key) + '">' + noteView(key, note) + '</div></div>';
      });
      h += '</section>';
    });
    if (starredView && !starCount(meta.id + '/')) {
      h += '<div class="empty-state">★<p>' + esc(t('noStarred')) + '</p></div>';
    }
    if (ch.terms && ch.terms.length) {
      h += '<section class="section"><h2 class="sec-title"><span class="sn">✦</span><div>' + esc(t('keyTerms')) + '</div></h2><div class="terms">';
      ch.terms.forEach(function (term) {
        h += '<div class="term">' + stack(term.term, 'div', 'term-title') + (term.def ? stack(term.def, 'p', 'term-def') : '') + '</div>';
      });
      h += '</div></section>';
    }
    if (!starredView) h += '<div class="learn-cta"><a class="btn primary" href="#/' + encodeURIComponent(meta.id) + '/practice">' + esc(t('practice')) + ' →</a></div>';
    return h;
  }

  function noteView(key, note) {
    if (!note) return '<button class="note-add" type="button" data-act="note-edit">✎ ' + esc(t('addNote')) + '</button>';
    return '<div class="note"><div class="note-head"><span>' + esc(t('note')) + '</span><span class="note-acts">' +
      '<button type="button" data-act="note-edit">' + esc(t('edit')) + '</button><button type="button" data-act="note-del">' + esc(t('del')) + '</button></span></div>' +
      '<div class="note-text">' + mk(key + '/note', note) + '</div></div>';
  }
  function noteEditor(key) {
    var cur = window.BookleafAnnot.state.notes[key] || '';
    return '<div class="note editing"><textarea class="note-input" maxlength="' + window.BookleafAnnot.NOTE_MAX + '" placeholder="' + esc(t('notePlaceholder')) + '">' + esc(cur) + '</textarea>' +
      '<div class="note-foot"><span class="note-count">' + cur.length + ' / ' + window.BookleafAnnot.NOTE_MAX + ' ' + esc(t('chars')) + '</span>' +
      '<span class="note-actions"><button class="btn" type="button" data-act="note-cancel">' + esc(t('cancel')) + '</button><button class="btn primary" type="button" data-act="note-save">' + esc(t('save')) + '</button></span></div></div>';
  }
  function autoGrow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 580) + 'px'; }

  function bindPointActions(meta, ch) {
    main.querySelectorAll('button[data-act="star"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pt = btn.closest('.point');
        if (!pt) return;
        var key = pt.dataset.key, on = !window.BookleafAnnot.state.stars[key];
        localWriteUntil = Date.now() + 700;
        window.BookleafAnnot.star(key, on);
        pt.classList.toggle('starred', on);
        btn.textContent = on ? '★' : '☆';
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', t(on ? 'unstar' : 'star'));
        btn.title = t(on ? 'unstar' : 'star');
        renderSidebar(meta.id, ch, currentRoute.view);
        if (currentRoute.view === 'starred' && !on) pt.remove();
      });
    });

    main.querySelectorAll('.note-wrap').forEach(function (wrap) {
      var key = wrap.dataset.noteKey;
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (!b) return;
        var act = b.dataset.act;
        if (act === 'note-edit') {
          wrap.innerHTML = noteEditor(key);
          var ta = wrap.querySelector('textarea');
          autoGrow(ta); ta.focus();
          ta.addEventListener('input', function () { wrap.querySelector('.note-count').textContent = ta.value.length + ' / ' + window.BookleafAnnot.NOTE_MAX + ' ' + t('chars'); autoGrow(ta); });
        } else if (act === 'note-cancel') {
          wrap.innerHTML = noteView(key, window.BookleafAnnot.state.notes[key] || '');
        } else if (act === 'note-save') {
          var txt = wrap.querySelector('textarea').value.slice(0, window.BookleafAnnot.NOTE_MAX).replace(/\s+$/, '');
          var old = window.BookleafAnnot.state.notes[key] || '';
          localWriteUntil = Date.now() + 700;
          window.BookleafAnnot.note(key, txt, window.BookleafAnnot.shift(window.BookleafAnnot.state.marks[key + '/note'], old, txt));
          wrap.innerHTML = noteView(key, txt);
        } else if (act === 'note-del') {
          if (confirm(t('del') + '?')) {
            localWriteUntil = Date.now() + 700;
            window.BookleafAnnot.note(key, '', []);
            wrap.innerHTML = noteView(key, '');
          }
        }
      });
    });
  }

  /* --------------------------------------------------------------- practice */
  function exL(v) { return v && typeof v === 'object' || typeof v === 'string' ? asLoc(v) : asLoc(''); }
  function exQuestion(e) { return exL(e.q); }
  function exExplain(e) { return exL(e.explain); }
  function typeLabel(type) {
    var names = {
      choice: { zh: '单选', en: 'Multiple choice', es: 'Opción múltiple' },
      truefalse: { zh: '判断', en: 'True / False', es: 'Verdadero / falso' },
      fill: { zh: '填空', en: 'Fill in', es: 'Completar' },
      open: { zh: '简答', en: 'Short answer', es: 'Respuesta breve' },
      scenario: { zh: '场景设计', en: 'Design scenario', es: 'Diseño de escenario' }
    };
    return pick(names[type] || { zh: type, en: type, es: type });
  }
  function sectionTitleFor(meta, ch, num) {
    var s = (ch.sections || []).filter(function (x) { return x.num === num; })[0];
    return s ? pick(s.title) : ('§' + num);
  }
  function renderPractice(meta, ch) {
    var exercises = ch.exercises || [];
    var nScn = exercises.filter(function (e) { return e.type === 'scenario'; }).length;
    var h = '<div class="ex-head"><span class="ex-score" id="exScore"></span><button class="btn" type="button" id="exReset">' + esc(t('reset')) + '</button></div>';
    h += '<div class="ex-filter" role="group" aria-label="' + esc(t('filter')) + '">' +
      '<button type="button" data-f="all" class="on">' + esc(t('allEx')) + '<span>' + exercises.length + '</span></button>' +
      '<button type="button" data-f="basic">' + esc(t('basics')) + '<span>' + (exercises.length - nScn) + '</span></button>' +
      '<button type="button" data-f="scenario">' + esc(t('scenarios')) + '<span>' + nScn + '</span></button></div>';
    exercises.forEach(function (e, i) { h += renderExercise(meta, ch, e, i); });
    return h;
  }

  function renderExercise(meta, ch, e, i) {
    var scn = e.type === 'scenario';
    var h = '<div class="ex' + (scn ? ' ex-scn' : '') + '" data-i="' + i + '" data-kind="' + (scn ? 'scenario' : 'basic') + '">' +
      '<div class="ex-meta"><span class="type">' + esc(typeLabel(e.type)) + '</span><span>' + esc(t('q')) + ' ' + (i + 1) + '</span>' +
      '<span>' + esc(t('exRef')) + ': ' + esc(sectionTitleFor(meta, ch, e.ref)) + '</span></div>';
    if (scn) {
      var draft = localStorage.getItem(ns + ':draft:' + meta.id + ':' + i) || '';
      h += '<h3 class="scn-title">' + stackInline(exL(e.title), 'scn-title-stack') + '</h3>' +
        '<div class="ex-q">' + stack(exQuestion(e), 'p') + '</div>' +
        '<textarea class="open-area scn-area" placeholder="' + esc(t('writeDesign')) + '">' + esc(draft) + '</textarea>' +
        '<button class="btn primary reveal" type="button">' + esc(t('revealDesign')) + '</button><div class="fb"></div></div>';
      return h;
    }
    var q = '<div class="ex-q">' + stack(exQuestion(e), 'p') + '</div>';
    h += q;
    if (e.type === 'choice') {
      h += '<div class="opts">';
      (e.options || []).forEach(function (o, k) {
        h += '<button class="opt" type="button" data-k="' + k + '"><span class="k">' + 'ABCDEFG'[k] + '</span><span class="opt-copy">' + stack(asLoc(o), 'span') + '</span></button>';
      });
      h += '</div>';
    } else if (e.type === 'truefalse') {
      h += '<div class="tf"><button class="opt" type="button" data-k="true"><span>✓ ' + esc(t('true')) + '</span></button><button class="opt" type="button" data-k="false"><span>✗ ' + esc(t('false')) + '</span></button></div>';
    } else if (e.type === 'fill') {
      h += '<form class="fill-row"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(t('typeAnswer')) + '"><button class="btn primary" type="submit">' + esc(t('submit')) + '</button></form>';
    } else {
      h += '<textarea class="open-area" placeholder="' + esc(t('writeFirst')) + '"></textarea><button class="btn primary reveal" type="button">' + esc(t('reveal')) + '</button>';
    }
    return h + '<div class="fb"></div></div>';
  }

  function acceptedAnswers(e) {
    if (e.type === 'fill') {
      var arr = Array.isArray(e.answer) ? e.answer.slice() : [];
      if (e.answerText) {
        var o = asLoc(e.answerText);
        activeContentLangs().forEach(function (k) { if (o[k]) arr.push(o[k]); });
      }
      return arr.filter(Boolean);
    }
    return [];
  }
  function answerDisplay(e) {
    if (e.type === 'fill') {
      if (e.answerText) return asLoc(e.answerText);
      var a = (e.answer || [])[0] || '';
      return asLoc(a);
    }
    if (e.type === 'open' || e.type === 'scenario') return exL(e.answer);
    return asLoc('');
  }
  function norm(s) { return String(s).toLowerCase().replace(/[\s\u3000"“”'‘’`()（）.。,，;；:：!！?？\-_]/g, ''); }

  function bindPractice(meta, ch) {
    var results = {};
    var scoreEl = document.getElementById('exScore');
    function update() {
      var n = Object.keys(results).length, ok = 0;
      for (var k in results) if (results[k]) ok++;
      var gradable = (ch.exercises || []).filter(function (e) { return e.type !== 'open' && e.type !== 'scenario'; }).length;
      var nScn = (ch.exercises || []).length - (ch.exercises || []).filter(function (e) { return e.type !== 'scenario'; }).length;
      var scnDone = main.querySelectorAll('.ex-scn .reveal:disabled').length;
      if (scoreEl) scoreEl.textContent = ok + ' / ' + gradable + (nScn ? ' · ' + t('scenarios') + ' ' + scnDone + ' / ' + nScn : '');
      var p = getProgress();
      p[meta.id] = p[meta.id] || {};
      if (n >= gradable) { p[meta.id].score = ok; p[meta.id].total = gradable; saveProgress(p); }
    }
    function feedback(box, e, correct) {
      var fb = box.querySelector('.fb');
      var ans = answerDisplay(e);
      var isOpen = e.type === 'open';
      var label = isOpen ? t('reference') : (correct ? t('correct') : t('wrong'));
      var cls = isOpen ? '' : (correct ? 'ok' : 'no');
      var ansHtml = '';
      if (e.type === 'fill' || isOpen) {
        ansHtml = '<div class="ans"><b class="ans-label">' + esc(t('reference')) + '</b>' + stack(ans, 'div', 'ans-stack') + '</div>';
      } else if (e.type === 'choice') {
        var correctOption = asLoc((e.options || [])[e.answer]);
        ansHtml = '<div class="ans"><b class="ans-label">' + esc(t('reference')) + '</b>' + stack(correctOption, 'div', 'ans-stack') + '</div>';
      } else if (e.type === 'truefalse') {
        ansHtml = '<div class="ans"><b class="ans-label">' + esc(t('reference')) + '</b>' + stack(asLoc({
          zh: e.answer ? '正确' : '错误', en: e.answer ? 'True' : 'False', es: e.answer ? 'Verdadero' : 'Falso'
        }), 'div', 'ans-stack') + '</div>';
      }
      fb.innerHTML = '<div class="feedback ' + cls + '"><b>' + esc(label) + '</b>' + ansHtml +
        '<div class="explain">' + stack(exExplain(e), 'div') + '</div></div>';
    }
    main.querySelectorAll('.ex').forEach(function (box) {
      var i = +box.dataset.i, e = ch.exercises[i];
      if (e.type === 'choice' || e.type === 'truefalse') {
        box.addEventListener('click', function (ev) {
          var b = ev.target.closest('.opt');
          if (!b || b.disabled) return;
          var pickValue = e.type === 'choice' ? +b.dataset.k : b.dataset.k === 'true';
          var correct = pickValue === e.answer;
          box.querySelectorAll('.opt').forEach(function (o) {
            o.disabled = true;
            var value = e.type === 'choice' ? +o.dataset.k : o.dataset.k === 'true';
            if (value === e.answer) o.classList.add('right');
          });
          if (!correct) b.classList.add('wrong');
          results[i] = correct;
          feedback(box, e, correct);
          update();
        });
      } else if (e.type === 'fill') {
        box.querySelector('form').addEventListener('submit', function (ev) {
          ev.preventDefault();
          var input = box.querySelector('input');
          if (!input.value.trim() || i in results) return;
          var v = norm(input.value);
          var correct = acceptedAnswers(e).some(function (a) { return norm(a) === v; });
          input.classList.add(correct ? 'right' : 'wrong'); input.readOnly = true;
          box.querySelector('button[type=submit]').disabled = true;
          results[i] = correct;
          feedback(box, e, correct);
          update();
        });
      } else if (e.type === 'scenario') {
        var ta = box.querySelector('textarea'), saveT = null;
        ta.addEventListener('input', function () {
          clearTimeout(saveT);
          saveT = setTimeout(function () { try { localStorage.setItem(ns + ':draft:' + meta.id + ':' + i, ta.value); } catch (err) {} }, 350);
        });
        box.querySelector('.reveal').addEventListener('click', function (ev) {
          ev.target.disabled = true;
          var fb = box.querySelector('.fb');
          var checklist = e.checklist || [];
          fb.innerHTML = '<div class="feedback scn-fb"><b>' + esc(t('designReference')) + '</b>' +
            '<div class="ans scn-ans">' + stack(answerDisplay(e), 'div') + '</div>' +
            (e.code ? '<pre><code>' + highlight(e.code) + '</code></pre>' : '') +
            (checklist.length ? '<div class="scn-check"><b>' + esc(t('selfCheck')) + '</b>' + checklist.map(function (c, k) {
              return '<label><input type="checkbox" data-k="' + k + '"><span class="lset inline' + (activeContentLangs().length === 1 ? ' single' : '') + '">' + activeContentLangs().map(function (lk) { return '<span class="lg lg-' + lk + '" lang="' + LANG_HTML[lk] + '" data-lang="' + LANG_NAME[lk] + '">' + esc(asLoc(c)[lk] || '') + '</span>'; }).join('') + '</span></label>';
            }).join('') + '<div class="scn-score"></div></div>' : '') +
            '<div class="scn-explain">' + stack(exExplain(e), 'div') + '</div></div>';
          var boxes = fb.querySelectorAll('input[type=checkbox]');
          var sc = fb.querySelector('.scn-score');
          function tally() {
            if (!sc) return;
            var hit = 0; boxes.forEach(function (b) { if (b.checked) hit++; });
            sc.textContent = t('covered') + ' ' + hit + ' / ' + boxes.length;
          }
          fb.addEventListener('change', tally); tally(); update();
        });
      } else {
        box.querySelector('.reveal').addEventListener('click', function (ev) {
          ev.target.disabled = true; feedback(box, e, null);
        });
      }
    });
    var filter = main.querySelector('.ex-filter');
    if (filter) filter.addEventListener('click', function (ev) {
      var b = ev.target.closest('button');
      if (!b) return;
      filter.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      main.querySelectorAll('.ex').forEach(function (x) {
        x.style.display = b.dataset.f === 'all' || x.dataset.kind === b.dataset.f ? '' : 'none';
      });
    });
    var reset = document.getElementById('exReset');
    if (reset) reset.addEventListener('click', function () {
      (ch.exercises || []).forEach(function (e, i) {
        if (e.type === 'scenario') { try { localStorage.removeItem(ns + ':draft:' + meta.id + ':' + i); } catch (err) {} }
      });
      renderChapter(meta, ch, 'practice');
      renderSidebar(meta.id, ch, 'practice');
    });
    update();
  }

  function markRead(id) {
    var p = getProgress();
    p[id] = p[id] || {};
    if (!p[id].read) { p[id].read = true; saveProgress(p); }
  }

  /* -------------------------------------------------------------- selection */
  var tb = document.createElement('div');
  tb.className = 'mk-bar';
  tb.setAttribute('role', 'toolbar');
  tb.setAttribute('aria-label', 'Ink');
  tb.innerHTML =
    '<button type="button" data-k="hl" aria-label="Highlighter" title="Highlighter · 荧光笔 · Rotulador"><i class="sw sw-hl"></i><span>高亮</span></button>' +
    '<button type="button" data-k="hg" aria-label="Green highlighter" title="Green highlighter · 绿色荧光笔 · Rotulador verde"><i class="sw sw-hg"></i></button>' +
    '<button type="button" data-k="hb" aria-label="Blue highlighter" title="Blue highlighter · 蓝色荧光笔 · Rotulador azul"><i class="sw sw-hb"></i></button>' +
    '<button type="button" data-k="hp" aria-label="Pink highlighter" title="Pink highlighter · 粉色荧光笔 · Rotulador rosa"><i class="sw sw-hp"></i></button>' +
    '<span class="tb-sep"></span>' +
    '<button type="button" data-k="r" aria-label="Red pen" title="Red pen · 红笔 · Pluma roja"><i class="sw sw-r"></i></button>' +
    '<button type="button" data-k="b" aria-label="Blue pen" title="Blue pen · 蓝笔 · Pluma azul"><i class="sw sw-b"></i></button>' +
    '<button type="button" data-k="g" aria-label="Green pen" title="Green pen · 绿笔 · Pluma verde"><i class="sw sw-g"></i></button>' +
    '<button type="button" data-k="p" aria-label="Purple pen" title="Purple pen · 紫笔 · Pluma violeta"><i class="sw sw-p"></i></button>' +
    '<span class="tb-sep"></span>' +
    '<button type="button" data-k="x" class="tb-clear" aria-label="Clear ink" title="Clear · 清除 · Borrar">✕</button>';
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
    /* Below the selection by default: mobile OS action menus sit above it. */
    var y = r.bottom + 10;
    if (y + hgt > window.innerHeight - 8) y = Math.max(8, r.top - hgt - 10);
    tb.style.left = x + 'px';
    tb.style.top = y + 'px';
  }
  var selTimer = null;
  document.addEventListener('selectionchange', function () {
    clearTimeout(selTimer);
    selTimer = setTimeout(showBar, 160);
  });
  window.addEventListener('scroll', function () { if (selInfo) showBar(); }, { passive: true });
  window.addEventListener('resize', function () { if (selInfo) showBar(); });
  tb.addEventListener('pointerdown', function (e) { e.preventDefault(); });
  tb.addEventListener('mousedown', function (e) { e.preventDefault(); });
  tb.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !selInfo) return;
    var info = selInfo, cur = window.BookleafAnnot.state.marks[info.blk];
    var next = b.dataset.k === 'x'
      ? window.BookleafAnnot.clearMark(cur, info.s, info.e)
      : window.BookleafAnnot.addMark(cur, info.s, info.e, b.dataset.k);
    localWriteUntil = Date.now() + 700;
    window.BookleafAnnot.marks(info.blk, next);
    info.el.innerHTML = window.BookleafAnnot.render(info.el.textContent, next);
    window.getSelection().removeAllRanges();
    hideBar();
  });

  /* ------------------------------------------------------------------- sync */
  function mk(block, text) {
    return '<span class="mk" data-blk="' + esc(block) + '">' + window.BookleafAnnot.render(text, window.BookleafAnnot.state.marks[block]) + '</span>';
  }
  var syncText = {
    loading: ['⟳', 'loading'], syncing: ['⟳', 'syncing'], synced: ['✓', 'synced'],
    pending: ['…', 'pending'], local: ['!', 'localOnly'], error: ['!', 'syncError'], idle: ['—', 'localOnly']
  };
  function paintSync() {
    var A = window.BookleafAnnot;
    var s = A.status, pair = syncText[s] || syncText.synced;
    syncBtn.dataset.s = s;
    syncBtn.querySelector('.sync-ic').textContent = pair[0];
    syncBtn.querySelector('.sync-lbl').textContent = t(pair[1]);
    var n = A.pendingCount();
    syncBtn.querySelector('.sync-n').textContent = n && (s === 'local' || s === 'error' || s === 'pending') ? String(n) : '';
    syncBtn.title = t(pair[1]) + (A.detail ? ' · ' + A.detail : '') + (n ? ' · ' + n : '');
  }

  var dlg = document.getElementById('syncDlg');
  function openSync() {
    var A = window.BookleafAnnot;
    var cfg = book.annotations || {};
    var repo = book.repo || {};
    document.getElementById('tokInput').value = '';
    document.getElementById('syncRepo').textContent = repo.owner ? repo.owner + '/' + repo.name : '—';
    document.getElementById('syncFile').textContent = (cfg.branch || repo.branch || 'main') + ' / ' + (cfg.path || 'annotations.json');
    document.getElementById('tokState').textContent = A.hasToken() ? t('connected') : t('notConnected');
    document.getElementById('dlgStatus').textContent = t(syncText[A.status] ? syncText[A.status][1] : 'synced') + (A.detail ? ' · ' + A.detail : '') + (A.pendingCount() ? ' · ' + A.pendingCount() : '');
    document.getElementById('tokLogout').style.display = A.hasToken() ? '' : 'none';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  syncBtn.addEventListener('click', openSync);
  dlg.addEventListener('click', function (e) {
    var b = e.target.closest('[data-dlg]');
    if (e.target === dlg || (b && b.dataset.dlg === 'close')) { dlg.close ? dlg.close() : dlg.removeAttribute('open'); return; }
    if (!b) return;
    if (b.dataset.dlg === 'save') {
      var v = document.getElementById('tokInput').value.trim();
      if (!v) return;
      window.BookleafAnnot.setToken(v);
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    } else if (b.dataset.dlg === 'logout') {
      window.BookleafAnnot.setToken('');
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    } else if (b.dataset.dlg === 'refresh') {
      window.BookleafAnnot.refresh(true);
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
    }
  });

  /* ------------------------------------------------------------------- route */
  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, '');
    var parts = raw.split('/').filter(function (x) { return x !== ''; });
    var id = decodeURIComponent(parts[0] || '');
    var view = 'learn', point = null, section = '';
    if (parts[1] === 'practice') view = 'practice';
    else if (parts[1] === 'starred') view = 'starred';
    else if (parts[1] === 's' && parts[2]) { section = decodeURIComponent(parts[2]); }
    else if (parts[1] === 'p' && parts[2] !== undefined && parts[3] !== undefined) {
      section = decodeURIComponent(parts[2]);
      var meta = flat.filter(function (c) { return c.id === id; })[0];
      point = 'point-' + ((id + '/' + section + '/' + decodeURIComponent(parts[3])).replace(/[\/.]/g, '-'));
    }
    return { id: id, view: view, point: point, section: section };
  }

  function route(force) {
    if (!toc) return;
    closeMobileNav();
    var r = parseRoute();
    currentRoute = r;
    var meta = flat.filter(function (c) { return c.id === r.id; })[0];
    if (!meta) {
      currentRoute = { id: '', view: '', point: null, section: '' };
      document.title = pick(book.title) + ' · Bookleaf';
      renderHome();
      renderSidebar(null, null, '');
      window.scrollTo(0, 0);
      return;
    }
    renderSidebar(meta.id, cache[meta.id] || null, r.view);
    main.innerHTML = '<div class="loading">…</div>';
    loadChapter(meta.id).then(function (ch) {
      if (currentRoute.id !== meta.id) return;
      renderChapter(meta, ch, r.view, r.point);
      renderSidebar(meta.id, ch, r.view);
      document.title = pick(meta.title) + ' · ' + pick(book.title);
      if (!r.point && !r.section) window.scrollTo(0, 0);
      if (r.section && r.view === 'learn') {
        var target = document.getElementById('s-' + r.section);
        if (target) target.scrollIntoView({ block: 'start' });
      }
    }).catch(function (err) {
      console.error(err);
      main.innerHTML = '<div class="content"><div class="error">' + esc(t('loaded')) + '</div></div>';
    });
  }

  function closeMobileNav() {
    menuOpen = false;
    document.body.classList.remove('nav-open');
    if (window.innerWidth <= 960) sidebarBtn.setAttribute('aria-expanded', 'false');
  }

  /* --------------------------------------------------------------- controls */
  function paintLang() {
    langSeg.querySelectorAll('button').forEach(function (b) {
      var on = activeLangs.indexOf(b.dataset.lang) >= 0;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    root.setAttribute('data-langs', activeLangs.join(' '));
    root.setAttribute('lang', uiLang() === 'zh' ? 'zh-CN' : uiLang());
  }
  langSeg.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var lang = b.dataset.lang;
    if (activeLangs.indexOf(lang) >= 0) {
      if (activeLangs.length === 1) {
        langSeg.classList.add('shake');
        setTimeout(function () { langSeg.classList.remove('shake'); }, 400);
        return;
      }
      activeLangs = activeLangs.filter(function (x) { return x !== lang; });
    } else {
      activeLangs = LANGS.filter(function (k) { return activeLangs.indexOf(k) >= 0 || k === lang; });
    }
    saveLangs(); paintLang(); rerender();
  });

  function rerender() {
    if (window.BookleafAnnot.configured) window.BookleafAnnot.refresh(false);
    if (!toc) return;
    var id = currentRoute.id;
    if (!id) { renderHome(); renderSidebar(null, null, ''); return; }
    var meta = flat.filter(function (c) { return c.id === id; })[0];
    if (!meta) return;
    if (cache[id]) {
      renderChapter(meta, cache[id], currentRoute.view, currentRoute.point);
      renderSidebar(id, cache[id], currentRoute.view);
    } else route(true);
    paintSync();
  }

  function isDark() {
    var t = root.dataset.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintTheme() {
    themeBtn.setAttribute('aria-label', t('theme'));
    themeBtn.title = t('theme');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('bookleaf-theme', next); } catch (e) {}
    paintTheme();
  });

  sidebarBtn.addEventListener('click', function () {
    if (window.innerWidth <= 960) {
      menuOpen = !menuOpen;
      document.body.classList.toggle('nav-open', menuOpen);
      sidebarBtn.setAttribute('aria-expanded', String(menuOpen));
      if (menuOpen) renderSidebar(currentRoute.id, currentRoute.id ? cache[currentRoute.id] : null, currentRoute.view);
    } else {
      setSidebar(layout.classList.contains('sidebar-collapsed'));
    }
  });
  scrim.addEventListener('click', closeMobileNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMobileNav(); hideBar(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960) { menuOpen = false; document.body.classList.remove('nav-open'); }
    else layout.classList.remove('sidebar-collapsed');
  });

  /* --------------------------------------------------------- annotation feed */
  window.BookleafAnnot.onChange(function (state, status, detail) {
    paintSync();
    if (!toc) return;
    var s = sig();
    if (s === lastSig) return;
    lastSig = s;
    renderSidebar(currentRoute.id, currentRoute.id ? cache[currentRoute.id] : null, currentRoute.view);
    // Remote update: refresh visible content, unless the reader is actively
    // writing a note or selecting text.
    if (Date.now() < localWriteUntil || !currentRoute.id) return;
    if (main.querySelector('.note.editing') || selInfo) return;
    if (cache[currentRoute.id]) {
      var y = window.scrollY;
      renderChapter(flat.filter(function (c) { return c.id === currentRoute.id; })[0], cache[currentRoute.id], currentRoute.view, currentRoute.point);
      window.scrollTo(0, y);
    }
  });
  window.addEventListener('beforeunload', function () {
    if (window.BookleafAnnot.pendingCount() && window.BookleafAnnot.hasToken()) window.BookleafAnnot.flush();
  });
  window.addEventListener('focus', function () { if (window.BookleafAnnot.configured) window.BookleafAnnot.refresh(false); });
  setInterval(function () {
    if (!document.hidden && window.BookleafAnnot.configured) window.BookleafAnnot.refresh(false);
  }, 120000);

  /* ------------------------------------------------------------------- boot */
  try {
    var savedTheme = localStorage.getItem('bookleaf-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  } catch (e) {}
  try { sidebarCollapsed = lsGet(':sidebar-collapsed') === '1'; } catch (e) {}
  if (window.innerWidth <= 960) sidebarCollapsed = false;
  layout.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  paintLang();
  paintTheme();
  paintSync();
  renderSidebar(null, null, '');
  main.innerHTML = '<div class="loading">…</div>';

  fetch('data/toc.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (j) {
    normalizeManifest(j);
    window.addEventListener('hashchange', function () { route(false); });
    route(false);
    if (sidebarCollapsed) setSidebar(false);
    else sidebarBtn.setAttribute('aria-expanded', 'true');
    paintLang();
    paintTheme();
    paintSync();
  }).catch(function (err) {
    console.error(err);
    main.innerHTML = '<div class="content"><div class="error">' + esc(t('tocFail')) + '</div></div>';
  });

  /* Small syntax highlighter for the C++ snippets. */
  function highlight(code) {
    var kws = /\b(class|public|private|protected|virtual|void|int|float|double|bool|char|const|static|return|if|else|for|while|switch|case|break|continue|new|delete|struct|enum|typedef|template|typename|function|var|let|true|false|NULL|nullptr|this|override|unsigned|do|default|friend|inline|namespace|using|auto|sizeof|std|vector|map|string)\b/g;
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
})();
