'use strict';
const params = new URLSearchParams(window.location.search);
document.getElementById('reason').textContent = params.get('reason') || 'Unknown problem.';
if (params.get('remote') === '1') {
  document.getElementById('title').textContent = 'Girru could not be reached';
  document.getElementById('local').hidden = false;
}
document.getElementById('retry').addEventListener('click', () => window.dproDesktop.retry());
document.getElementById('logs').addEventListener('click', () => window.dproDesktop.showLogs());
document.getElementById('connect').addEventListener('click', () => window.dproDesktop.openConnect());
document.getElementById('local').addEventListener('click', () => window.dproDesktop.useLocal());
