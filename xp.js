// Employer buttons on the Work Experience page: show one employer at a time.
document.querySelectorAll('.xp-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.xp-tab').forEach(function (t) {
      t.setAttribute('aria-selected', String(t === tab));
    });
    document.querySelectorAll('.xp-panel').forEach(function (panel) {
      panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    });
  });
});
