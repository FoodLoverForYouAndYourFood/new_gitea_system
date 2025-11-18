/*
 Gamification layer:
 - Tracks read pages, XP, scroll progress per page (localStorage)
 - Auto-marks page as read at 80% scroll
 - Builds a “Самопроверка” чек-лист из заголовков (h2/h3)
 - Injects виджет прогресса в сайдбар/подвал
*/

(function(){
  var eventsBound = false;
  var READ_KEY = 'sa_read_articles';
  var XP_KEY = 'sa_xp';
  var SCROLL_KEY_PREFIX = 'sa_scroll_';
  var CHECKLIST_PREFIX = 'sa_checklist_';
  var LEVELS = [
    { name: 'Новичок', prefix: '/01-basics/' },
    { name: 'Специалист', prefix: '/02-middle/' },
    { name: 'Эксперт', prefix: '/03-pro/' }
  ];

  function safeJSONGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || fallback); }
    catch(e){ return JSON.parse(fallback); }
  }
  function getRead() { return safeJSONGet(READ_KEY, '[]'); }
  function setRead(v){ localStorage.setItem(READ_KEY, JSON.stringify(v)); }
  function getXP() {
    var xp = parseInt(localStorage.getItem(XP_KEY) || '0', 10);
    return isNaN(xp) ? 0 : xp;
  }
  function setXP(v){ localStorage.setItem(XP_KEY, String(v)); }
  function getScroll(id){
    return parseInt(localStorage.getItem(SCROLL_KEY_PREFIX + id) || '0',10) || 0;
  }
  function setScroll(id, v){
    localStorage.setItem(SCROLL_KEY_PREFIX + id, String(v));
  }

  function normalizePath(href) {
    // keep only path part, drop hashes/query, ensure trailing slash style
    var a = document.createElement('a');
    a.href = href;
    var path = a.pathname || '';
    path = path.replace(/index\.html?$/,'');
    if (!path.endsWith('/')) path = path;
    return path || '/';
  }

  function collectPages() {
    var links = Array.from(document.querySelectorAll('.md-nav__link'));
    var paths = [];
    links.forEach(function(l){
      var href = l.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;
      var p = normalizePath(href);
      if (!paths.includes(p)) paths.push(p);
    });
    if (!paths.length) {
      // fallback to current page only
      paths = [normalizePath(window.location.pathname)];
    }
    return paths;
  }

  function markRead(articleId) {
    var read = getRead();
    if (!read.includes(articleId)) {
      read.push(articleId);
      setRead(read);
      setXP(getXP() + 10); // +10 XP за завершённую страницу
    }
    updateUI();
  }

  function updateGlobalProgress(pages) {
    var read = getRead();
    var total = pages.length || 1;
    var readCount = read.filter(function(r){ return pages.includes(r); }).length;
    var value = Math.min(100, Math.round((readCount / total) * 100));
    var bar = document.getElementById('sa-progress-bar');
    var label = document.getElementById('sa-progress-value');
    var xpLabel = document.getElementById('sa-xp-value');
    if (bar) bar.style.width = value + '%';
    if (label) label.textContent = value + '% · ' + readCount + '/' + total;
    if (xpLabel) xpLabel.textContent = getXP() + ' XP';

    var levelsEl = document.getElementById('sa-levels');
    if (levelsEl) {
      levelsEl.innerHTML = LEVELS.map(function(lvl){
        var lvlPages = pages.filter(function(p){ return p.startsWith(lvl.prefix); });
        var lvlTotal = lvlPages.length || 1;
        var lvlRead = read.filter(function(r){ return lvlPages.includes(r); }).length;
        var perc = Math.min(100, Math.round((lvlRead / lvlTotal) * 100));
        return '<div class="sa-level-row"><span>'+lvl.name+'</span><span>'+perc+'% ('+lvlRead+'/'+lvlTotal+')</span></div>';
      }).join('');
    }
  }

  function updatePageProgress(articleId) {
    var perc = getScroll(articleId);
    var bar = document.getElementById('sa-page-scroll');
    var label = document.getElementById('sa-page-scroll-value');
    if (bar) bar.style.width = perc + '%';
    if (label) label.textContent = perc + '%';
  }

  function handleScroll() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = (doc && doc.scrollTop) || body.scrollTop || 0;
    var scrollHeight = (doc && doc.scrollHeight) || body.scrollHeight || 1;
    var clientHeight = doc.clientHeight || body.clientHeight || 1;
    var perc = Math.min(100, Math.round(scrollTop / (scrollHeight - clientHeight) * 100));
    var pageId = window.location.pathname;
    setScroll(pageId, perc);
    updatePageProgress(pageId);
    if (perc >= 80) {
      markRead(pageId);
    }
  }

  function cleanup() {
    var w = document.getElementById('sa-widget');
    if (w && w.parentNode) w.parentNode.removeChild(w);
    document.querySelectorAll('.sa-checklist').forEach(function(el){
      el.remove();
    });
  }

  function buildWidget() {
    if (document.getElementById('sa-widget')) return;
    // choose placement: right TOC sidebar -> left nav -> content top
    var mount = document.querySelector('.md-sidebar__inner') ||
                document.querySelector('.md-sidebar--secondary') ||
                document.querySelector('.md-sidebar') ||
                document.querySelector('.md-content__inner');
    var wrapper = document.createElement('div');
    wrapper.id = 'sa-widget';
    wrapper.innerHTML = [
      '<div class="sa-widget-row">',
        '<div class="sa-widget-title">Прогресс курса</div>',
        '<div id="sa-xp-value" class="sa-chip">0 XP</div>',
      '</div>',
      '<div class="sa-meta">Глобально</div>',
      '<div class="sa-bar"><div id="sa-progress-bar"></div></div>',
      '<div id="sa-progress-value" class="sa-small"></div>',
      '<div id="sa-levels" class="sa-levels"></div>',
      '<div class="sa-meta sa-top-gap">Страница</div>',
      '<div class="sa-bar small"><div id="sa-page-scroll"></div></div>',
      '<div id="sa-page-scroll-value" class="sa-small"></div>',
      '<button class="sa-mark-read" data-article="" type="button">Отметить как пройдено</button>'
    ].join('');

    if (mount) {
      // put on top for visibility
      mount.insertBefore(wrapper, mount.firstChild || null);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  function buildChecklist() {
    var headings = Array.from(document.querySelectorAll('.md-content h2, .md-content h3'));
    if (!headings.length) return;
    var pageId = window.location.pathname;
    var key = CHECKLIST_PREFIX + pageId;
    var saved = safeJSONGet(key, '{}');
    var container = document.createElement('div');
    container.className = 'sa-checklist';
    container.innerHTML = '<div class="sa-check-title">Самопроверка по разделам</div>';
    headings.slice(0,6).forEach(function(h, idx){
      var id = h.textContent.trim() || ('sec' + idx);
      var boxId = key + '_' + idx;
      var checked = !!saved[id];
      var item = document.createElement('label');
      item.className = 'sa-check-item';
      item.innerHTML = '<input type="checkbox" data-key="'+id+'" '+(checked?'checked':'')+'> <span>'+h.textContent+'</span>';
      container.appendChild(item);
    });
    var mount = document.querySelector('.md-content__inner');
    if (mount) mount.appendChild(container);

    container.addEventListener('change', function(e){
      if (e.target && e.target.matches('input[type="checkbox"]')) {
        saved[e.target.getAttribute('data-key')] = e.target.checked;
        localStorage.setItem(key, JSON.stringify(saved));
        var allChecked = Array.from(container.querySelectorAll('input')).every(function(i){ return i.checked; });
        if (allChecked) markRead(pageId);
      }
    });
  }

  function init() {
    cleanup();
    buildWidget();
    buildChecklist();
    var pages = collectPages();
    updateGlobalProgress(pages);
    updatePageProgress(window.location.pathname);
    if (!eventsBound) {
      eventsBound = true;
      document.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('click', function(e){
        var t = e.target;
        if (t.classList && t.classList.contains('sa-mark-read')) {
          var id = t.getAttribute('data-article') || window.location.pathname;
          markRead(id);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(init); // MkDocs Material instant navigation
  }

  // expose for debugging
  window.__sa = {
    getRead:getRead,
    getXP:getXP,
    markRead:markRead,
    getScroll:getScroll
  };
})();
