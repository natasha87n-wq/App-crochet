// ---------- Utility ----------
const $ = sel => document.querySelector(sel);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Rende cliccabili i link nel testo del modello
function linkify(text) {
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Ridimensiona le foto per non occupare troppo spazio
async function resizeImage(file, max = 1400) {
  const url = await readAsDataURL(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function progressOf(p) {
  const total = p.steps.length;
  const done = p.steps.filter(s => s.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

// ---------- Stato & navigazione ----------
let current = null;      // lavoro aperto nel dettaglio
let draft = null;        // lavoro in modifica nel form

const views = ['list', 'detail', 'form'];
function show(view, title) {
  views.forEach(v => { $('#view-' + v).hidden = v !== view; });
  $('#btn-back').hidden = view === 'list';
  $('#page-title').textContent = title || '🧶 I miei lavori';
  window.scrollTo(0, 0);
}

function route() {
  const hash = location.hash.slice(1);
  const [name, id] = hash.split('/');
  if (name === 'lavoro' && id) return openDetail(id);
  if (name === 'nuovo') return openForm(null);
  if (name === 'modifica' && id) return openForm(id);
  return renderList();
}
window.addEventListener('hashchange', route);

$('#btn-back').addEventListener('click', () => {
  if (history.length > 1) history.back(); else location.hash = '';
});

// ---------- Lista ----------
async function renderList() {
  show('list');
  const q = $('#search').value.trim().toLowerCase();
  let projects = await DB.all();
  projects.sort((a, b) => b.updatedAt - a.updatedAt);
  const total = projects.length;
  if (q) projects = projects.filter(p => p.title.toLowerCase().includes(q));

  $('#empty').hidden = total > 0;
  $('#project-grid').innerHTML = projects.map(p => {
    const pr = progressOf(p);
    const badge = pr.total && pr.done === pr.total ? '<span class="badge">Finito ✓</span>' : '';
    return `
      <a class="card" href="#lavoro/${p.id}">
        ${p.photo ? `<img src="${p.photo}" alt="">` : '<div class="photo-placeholder">🧶</div>'}
        ${badge}
        <div class="card-body">
          <strong>${esc(p.title)}</strong>
          <div class="progress"><div style="width:${pr.pct}%"></div></div>
          <small>${pr.total ? `${pr.done}/${pr.total} passi` : 'Nessun passo'}</small>
        </div>
      </a>`;
  }).join('');
}
$('#search').addEventListener('input', renderList);
$('#btn-new').addEventListener('click', () => { location.hash = 'nuovo'; });

// ---------- Dettaglio ----------
async function openDetail(id) {
  current = await DB.get(id);
  if (!current) { location.hash = ''; return; }
  show('detail', current.title);
  renderDetail();
}

function renderDetail() {
  const p = current;
  $('#d-photo').hidden = !p.photo;
  $('#d-photo-empty').hidden = !!p.photo;
  if (p.photo) $('#d-photo').src = p.photo;

  $('#d-title').textContent = p.title;
  const meta = [];
  if (p.yarn) meta.push('🧶 ' + p.yarn);
  if (p.hook) meta.push('🪝 ' + p.hook);
  $('#d-meta').textContent = meta.join('  ·  ');

  const pf = p.patternFile;
  if (pf && pf.type.startsWith('image/')) {
    $('#d-pattern-file').innerHTML = `<a href="${pf.data}" target="_blank"><img class="pattern-img" src="${pf.data}" alt="Modello"></a>`;
  } else if (pf) {
    $('#d-pattern-file').innerHTML = `<a class="btn btn-ghost" href="${pf.data}" download="${esc(pf.name)}">📄 Apri ${esc(pf.name)}</a>`;
  } else {
    $('#d-pattern-file').innerHTML = '';
  }
  $('#d-pattern-text').innerHTML = p.patternText
    ? linkify(p.patternText)
    : (pf ? '' : '<span class="muted">Nessun modello inserito.</span>');

  $('#d-steps').innerHTML = p.steps.length
    ? p.steps.map((s, i) => `
        <li class="${s.done ? 'done' : ''}">
          <label><input type="checkbox" data-i="${i}" ${s.done ? 'checked' : ''}>
          <span>${esc(s.text)}</span></label>
        </li>`).join('')
    : '<p class="muted">Nessun passo. Aggiungili con “Modifica”.</p>';

  updateProgress();
}

function updateProgress() {
  const pr = progressOf(current);
  $('#d-progress-bar').style.width = pr.pct + '%';
  $('#d-progress-text').textContent = pr.total ? `${pr.done}/${pr.total} · ${pr.pct}%` : '';
}

$('#d-steps').addEventListener('change', async e => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  current.steps[i].done = e.target.checked;
  e.target.closest('li').classList.toggle('done', e.target.checked);
  current.updatedAt = Date.now();
  await DB.put(current);
  updateProgress();
});

$('#btn-edit').addEventListener('click', () => { location.hash = 'modifica/' + current.id; });

$('#btn-reset').addEventListener('click', async () => {
  if (!confirm('Vuoi segnare tutti i passi come da fare?')) return;
  current.steps.forEach(s => { s.done = false; });
  await DB.put(current);
  renderDetail();
});

$('#btn-delete').addEventListener('click', async () => {
  if (!confirm(`Eliminare “${current.title}”? L'operazione non si può annullare.`)) return;
  await DB.remove(current.id);
  location.hash = '';
});

// ---------- Form ----------
const form = $('#project-form');

async function openForm(id) {
  const existing = id ? await DB.get(id) : null;
  draft = existing
    ? structuredClone(existing)
    : { id: uid(), title: '', yarn: '', hook: '', photo: null, patternText: '', patternFile: null, steps: [], createdAt: Date.now() };
  show('form', existing ? 'Modifica lavoro' : 'Nuovo lavoro');

  form.title.value = draft.title;
  form.yarn.value = draft.yarn || '';
  form.hook.value = draft.hook || '';
  form.patternText.value = draft.patternText || '';
  $('#f-bulk').value = '';
  renderFormPhoto();
  renderFormPattern();
  renderFormSteps();
}

function renderFormPhoto() {
  $('#f-photo-preview').hidden = !draft.photo;
  $('#f-photo-empty').hidden = !!draft.photo;
  $('#f-photo-remove').hidden = !draft.photo;
  if (draft.photo) $('#f-photo-preview').src = draft.photo;
}

function renderFormPattern() {
  $('#f-pattern-current').textContent = draft.patternFile ? '📎 ' + draft.patternFile.name : '';
  $('#f-pattern-remove').hidden = !draft.patternFile;
}

function syncStepsFromInputs() {
  document.querySelectorAll('#f-steps input[type=text]').forEach((inp, i) => {
    draft.steps[i].text = inp.value;
  });
}

function renderFormSteps() {
  $('#f-steps').innerHTML = draft.steps.map((s, i) => `
    <li>
      <input type="text" value="${esc(s.text)}" placeholder="Es. 6 maglie basse nell'anello magico">
      <button type="button" class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Su">↑</button>
      <button type="button" class="icon-btn" data-act="down" data-i="${i}" ${i === draft.steps.length - 1 ? 'disabled' : ''} aria-label="Giù">↓</button>
      <button type="button" class="icon-btn" data-act="del" data-i="${i}" aria-label="Elimina">✕</button>
    </li>`).join('');
}

$('#f-steps').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  syncStepsFromInputs();
  const i = Number(btn.dataset.i);
  const s = draft.steps;
  if (btn.dataset.act === 'del') s.splice(i, 1);
  if (btn.dataset.act === 'up') [s[i - 1], s[i]] = [s[i], s[i - 1]];
  if (btn.dataset.act === 'down') [s[i + 1], s[i]] = [s[i], s[i + 1]];
  renderFormSteps();
});

$('#f-add-step').addEventListener('click', () => {
  syncStepsFromInputs();
  draft.steps.push({ text: '', done: false });
  renderFormSteps();
  const inputs = document.querySelectorAll('#f-steps input');
  inputs[inputs.length - 1].focus();
});

$('#f-bulk-add').addEventListener('click', () => {
  syncStepsFromInputs();
  $('#f-bulk').value.split('\n').map(l => l.trim()).filter(Boolean)
    .forEach(text => draft.steps.push({ text, done: false }));
  $('#f-bulk').value = '';
  renderFormSteps();
});

$('#f-photo').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  draft.photo = await resizeImage(file);
  e.target.value = '';
  renderFormPhoto();
});
$('#f-photo-remove').addEventListener('click', () => { draft.photo = null; renderFormPhoto(); });

$('#f-pattern').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const data = file.type.startsWith('image/') ? await resizeImage(file, 2000) : await readAsDataURL(file);
  draft.patternFile = { name: file.name, type: file.type.startsWith('image/') ? 'image/jpeg' : file.type, data };
  e.target.value = '';
  renderFormPattern();
});
$('#f-pattern-remove').addEventListener('click', () => { draft.patternFile = null; renderFormPattern(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  syncStepsFromInputs();
  draft.title = form.title.value.trim();
  draft.yarn = form.yarn.value.trim();
  draft.hook = form.hook.value.trim();
  draft.patternText = form.patternText.value.trim();
  draft.steps = draft.steps.filter(s => s.text.trim());
  draft.updatedAt = Date.now();
  await DB.put(draft);
  location.replace('#lavoro/' + draft.id);
});

$('#f-cancel').addEventListener('click', () => history.back());

// ---------- Menu: backup ----------
$('#btn-menu').addEventListener('click', e => {
  e.stopPropagation();
  $('#menu').hidden = !$('#menu').hidden;
});
document.addEventListener('click', () => { $('#menu').hidden = true; });
$('#menu').addEventListener('click', e => e.stopPropagation());

$('#btn-export').addEventListener('click', async () => {
  const data = JSON.stringify({ app: 'uncinetto', version: 1, projects: await DB.all() });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = `lavori-uncinetto-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  $('#menu').hidden = true;
});

$('#input-import').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { projects } = JSON.parse(await file.text());
    if (!Array.isArray(projects)) throw new Error();
    for (const p of projects) await DB.put(p);
    alert(`Importati ${projects.length} lavori.`);
    $('#menu').hidden = true;
    location.hash = '';
    renderList();
  } catch {
    alert('File di backup non valido.');
  }
  e.target.value = '';
});

route();

// Installazione come app sul telefono + funzionamento offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // Chiede al browser di non cancellare i dati salvati
  navigator.storage?.persist?.();
}
