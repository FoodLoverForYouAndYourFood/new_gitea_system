/*
 Simple client-side progress & XP scaffold.
 - stores read articles in localStorage under key 'sa_read_articles'
 - stores xp as integer under 'sa_xp'
 - updates elements with class .progress-wrapper and .progress-bar
*/

(function(){
  function getRead() {
    try {
      return JSON.parse(localStorage.getItem('sa_read_articles')||'[]');
    } catch(e){ return []; }
  }
  function setRead(arr) {
    localStorage.setItem('sa_read_articles', JSON.stringify(arr));
  }
  function getXP() {
    return parseInt(localStorage.getItem('sa_xp')||'0',10);
  }
  function setXP(v) {
    localStorage.setItem('sa_xp', String(v));
  }

  function markRead(articleId) {
    var read = getRead();
    if (!read.includes(articleId)) {
      read.push(articleId);
      setRead(read);
      var xp = getXP() + 10;
      setXP(xp);
    }
    updateUI();
  }

  function updateUI() {
    var read = getRead();
    var total = document.querySelectorAll('article, .md-content').length || 1;
    var value = Math.min(100, Math.round((read.length / total) * 100));
    var bar = document.getElementById('progress-bar');
    var label = document.getElementById('progress-value');
    if (bar) bar.style.width = value + '%';
    if (label) label.textContent = String(value);
  }

  document.addEventListener('click', function(e){
    var t = e.target;
    if (t.classList && t.classList.contains('sa-mark-read')) {
      var id = t.getAttribute('data-article') || window.location.pathname;
      markRead(id);
    }
  });

  // init on load
  document.addEventListener('DOMContentLoaded', function(){
    updateUI();
  });

  // expose for debugging
  window.__sa = { getRead:getRead, getXP:getXP, markRead: markRead };
})();