'use strict';
const api = window.dproDesktop;
const error = document.getElementById('error');
const status = document.getElementById('status');
const sources = document.getElementById('sources');
const primary = document.getElementById('primary');
const separate = document.getElementById('separate');
const separateConfirm = document.getElementById('separate-confirm');
let selectedWorkspace = null;
let hasEarlierData = false;

async function run(fn) {
  error.textContent = '';
  primary.disabled = true;
  try {
    const result = await fn();
    if (result?.error) error.textContent = result.error;
  } catch {
    error.textContent = 'Girru could not open that workspace. Your existing data was not replaced.';
  } finally {
    primary.disabled = false;
  }
}

function lastUsedText(date, now = new Date()) {
  const day = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined }).format(date);
}

function workspaceRow(row, index) {
  const item = document.createElement('div');
  item.className = 'workspace-row';
  const summary = document.createElement('button');
  summary.type = 'button';
  summary.className = 'workspace-summary';
  const avatar = document.createElement('span');
  avatar.className = 'workspace-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  const ownerName = typeof row.ownerName === 'string' && row.ownerName.trim() ? row.ownerName.trim() : `Workspace ${index + 1}`;
  avatar.textContent = [...ownerName][0].toUpperCase();
  const text = document.createElement('span');
  text.className = 'workspace-detail';
  const details = [];
  if (Number.isSafeInteger(row.agents) && row.agents >= 0) details.push(`${row.agents} ${row.agents === 1 ? 'agent' : 'agents'}`);
  if (typeof row.lastUsed === 'string') {
    const date = new Date(`${row.lastUsed.replace(' ', 'T')}Z`);
    if (Number.isFinite(date.getTime())) details.push(`Last used ${lastUsedText(date)}`);
  }
  text.textContent = row.state === 'existing'
    ? [ownerName, details.join(' · ')].filter(Boolean).join('\n')
    : row.state === 'unreadable'
      ? `Workspace ${index + 1}\nCould not verify; the data will not be changed`
      : `Workspace ${index + 1} · No owner account`;
  summary.setAttribute('aria-pressed', row.dir === selectedWorkspace ? 'true' : 'false');
  summary.disabled = row.state !== 'existing';
  summary.append(avatar, text);
  item.append(summary);
  if (row.state === 'existing') {
    summary.setAttribute('aria-label', `Select ${ownerName}`);
    summary.onclick = () => { selectedWorkspace = row.dir; void refresh(); };
  }
  return item;
}

async function refresh() {
  const rows = await api.discoverData();
  sources.replaceChildren();
  const relevant = rows.filter(row => row.state !== 'missing');
  const verified = relevant.filter(row => row.state === 'existing');
  const needsChoice = relevant.some(row => row.state === 'unreadable' || row.state === 'existing' || row.state === 'unconfigured');
  hasEarlierData = needsChoice;
  if (!verified.some(row => row.dir === selectedWorkspace)) selectedWorkspace = verified[0]?.dir ?? null;
  status.textContent = verified.length
    ? 'Girru found an earlier workspace. Select it to continue, or start a separate workspace.'
    : needsChoice
      ? 'Girru found earlier data it could not open. It will not change that data.'
    : 'No earlier workspace was found. You can set up this computer.';
  if (relevant.length) {
    sources.hidden = false;
    sources.setAttribute('aria-label', 'Workspaces found on this computer');
    relevant.forEach((row, index) => sources.append(workspaceRow(row, index)));
  } else {
    sources.hidden = true;
  }
  separate.hidden = !needsChoice;
  if (selectedWorkspace) {
    primary.textContent = 'Open my workspace';
    primary.disabled = false;
    primary.onclick = () => run(() => api.selectData(selectedWorkspace));
  } else {
    primary.textContent = 'Set up Girru on this computer';
    primary.disabled = false;
    // Earlier data that cannot be opened stays untouched: setting up asks once, then makes a separate workspace.
    primary.onclick = () => needsChoice ? separateConfirm.showModal() : run(() => api.newWorkspace(true));
  }
}

primary.onclick = () => run(() => api.newWorkspace(true));
document.getElementById('folder').onclick = () => run(async () => {
  const result = await api.findData();
  await refresh();
  return result;
});
document.getElementById('connect').onclick = () => run(() => api.openConnect());
separate.onclick = () => { if (hasEarlierData) separateConfirm.showModal(); };
document.getElementById('cancel-separate').onclick = () => separateConfirm.close();
document.getElementById('confirm-separate').onclick = () => {
  separateConfirm.close();
  void run(() => api.newWorkspace(true));
};
void refresh().catch(() => {
  status.textContent = 'Girru could not inspect existing data. Choose a folder if you used Girru before.';
  error.textContent = 'No account has been created. Your files have not been changed.';
});
