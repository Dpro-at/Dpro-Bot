'use strict';
const status = document.getElementById('start-status');
const allowed = new Set([
  'Looking for an existing workspace…',
  'Checking the installation files…',
  'Preparing your workspace…',
  'Starting the local engine…',
  'Opening your workspace…',
]);
const initial = new URLSearchParams(window.location.search).get('status');
if (allowed.has(initial)) status.textContent = initial;
window.dproDesktop?.onStartupStatus(value => {
  if (allowed.has(value)) status.textContent = value;
});
