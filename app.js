
/**
 * SimCheck — Application Logic
 * Handles file upload, UI rendering, and results display
 */

/* ─── State ─── */
let state = {
  rawData: null,
  labels: [],
  texts: [],
  field: null,
  fields: [],
  matrices: null,
  ensemble: null,
  selectedAlgos: [],
  currentHeatmapAlgo: 'ensemble',
  allPairs: [],
};

/* ─── Sample Data ─── */
const SAMPLES = {
  texts: [
    { id: "S1", text: "Database management systems are used to store and retrieve data efficiently." },
    { id: "S2", text: "Data retrieval in database systems is done efficiently using query optimizers." },
    { id: "S3", text: "Machine learning models require large amounts of training data." },
    { id: "S4", text: "Neural networks learn patterns from large datasets during training phases." },
    { id: "S5", text: "SQL is a language designed for managing relational database systems." },
    { id: "S6", text: "Relational databases use SQL as the primary data manipulation language." },
  ],
  assignments: [
    { student: "Alex", answer: "The ER model represents entities with attributes and relationships using cardinality constraints. Entities are converted to tables and relationships become foreign keys in relational schema." },
    { student: "Beth", answer: "Entity-relationship diagrams show entities, their attributes, and the cardinality of relationships between them. In the relational model, entities become tables and relationships are represented as foreign keys." },
    { student: "Carlos", answer: "In database design, ER models use entities and relationships to model the real world. The conversion to relational schema turns entities into tables with primary keys." },
    { student: "Diana", answer: "Python is a general-purpose programming language used for scripting and data science applications." },
    { student: "Eve", answer: "Normalization ensures data integrity by eliminating redundancy. 1NF, 2NF, and 3NF are the common normal forms used to organize relational tables." },
    { student: "Frank", answer: "ER diagrams model database schemas by identifying entities, attributes, and relationships with cardinalities such as one-to-many and many-to-many." },
  ],
  paragraphs: [
    { title: "Para A", content: "The quick brown fox jumps over the lazy dog near the river bank in the afternoon." },
    { title: "Para B", content: "A quick brown fox leaped over a lazy dog near the river in the afternoon sun." },
    { title: "Para C", content: "Artificial intelligence is transforming every industry through automation and intelligent systems." },
    { title: "Para D", content: "Industries are being transformed by AI and automation, changing the nature of intelligent work." },
    { title: "Para E", content: "The stock market experienced high volatility due to interest rate decisions by central banks." },
    { title: "Para F", content: "Central bank interest rate decisions caused significant volatility in global stock markets." },
  ]
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  setupDrop();
  setupAlgoCards();
  setupFileInput();
});

function setupAlgoCards() {
  document.querySelectorAll('.algo-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      const cb = card.querySelector('input[type="checkbox"]');
      cb.checked = card.classList.contains('selected');
    });
  });
}

function setupDrop() {
  const zone = document.getElementById('dropZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });
  zone.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') document.getElementById('fileInput').click();
  });
}

function setupFileInput() {
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  });
}

/* ─── File Processing ─── */
function processFile(file) {
  if (!file.name.endsWith('.json')) { showToast('Please upload a .json file', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      loadData(data, file.name);
    } catch {
      showToast('Invalid JSON — please check your file.', 'error');
    }
  };
  reader.readAsText(file);
}

function loadSample(name) {
  loadData(SAMPLES[name], `sample_${name}.json`);
}

function loadData(data, filename) {
  state.rawData = data;
  const arr = Array.isArray(data) ? data : [data];

  // Auto-detect structure
  if (arr.length === 0) { showToast('Empty JSON array.', 'error'); return; }

  const firstItem = arr[0];
  if (typeof firstItem === 'string') {
    // Array of strings
    state.fields = ['__raw__'];
    state.field = '__raw__';
    state.texts = arr.map(String);
    state.labels = arr.map((_, i) => `Item ${i + 1}`);
  } else if (typeof firstItem === 'object') {
    // Array of objects — detect text-like fields
    const keys = Object.keys(firstItem);
    const textFields = keys.filter(k => {
      const samples = arr.slice(0, 5).map(item => String(item[k] || ''));
      const avg = samples.reduce((a, b) => a + b.length, 0) / samples.length;
      return avg > 10; // likely a text field
    });
    state.fields = textFields.length ? textFields : keys;
    state.field = state.fields[0];
    state.texts = arr.map(item => String(item[state.field] || ''));
    // Auto-label using first non-selected text-looking key or index
    const labelKey = keys.find(k => k !== state.field && arr.every(i => i[k] !== undefined));
    state.labels = arr.map((item, i) => labelKey ? String(item[labelKey]).slice(0, 20) : `Item ${i + 1}`);
  } else {
    showToast('Unsupported JSON format.', 'error'); return;
  }

  if (state.texts.length < 2) { showToast('Need at least 2 items to compare.', 'error'); return; }

  show('uploadSection', false);
  show('configSection', true);
  show('resultsSection', false);

  document.getElementById('fileBadge').innerHTML =
    `<span class="badge-icon">📄</span> ${filename} <span class="badge-count">${state.texts.length} items</span>`;

  renderFieldSelector();
}

function renderFieldSelector() {
  const wrap = document.getElementById('fieldOptions');
  const cont = document.getElementById('fieldSelector');

  if (state.fields.length <= 1 && state.fields[0] === '__raw__') {
    cont.style.display = 'none'; return;
  }
  cont.style.display = 'block';
  wrap.innerHTML = state.fields.map(f =>
    `<button class="field-btn ${f === state.field ? 'active' : ''}" onclick="selectField('${f}')">${f}</button>`
  ).join('');
}

function selectField(f) {
  state.field = f;
  const arr = Array.isArray(state.rawData) ? state.rawData : [state.rawData];
  state.texts = arr.map(item => String(item[f] || ''));
  document.querySelectorAll('.field-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === f);
  });
}

/* ─── Run Analysis ─── */
function runAnalysis() {
  state.selectedAlgos = [...document.querySelectorAll('.algo-card.selected input')]
    .map(cb => cb.value);

  if (state.selectedAlgos.length === 0) { showToast('Select at least one algorithm.', 'error'); return; }

  const btn = document.getElementById('runBtn');
  btn.classList.add('loading');
  btn.querySelector('.run-text').textContent = 'Computing…';

  setTimeout(() => {
    try {
      state.matrices = computeAllSimilarities(state.texts, state.selectedAlgos);
      state.ensemble = computeEnsembleMatrix(state.matrices, state.selectedAlgos);
      state.currentHeatmapAlgo = 'ensemble';
      renderResults();
      show('configSection', false);
      show('resultsSection', true);
      document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showToast('Error during analysis: ' + err.message, 'error');
    } finally {
      btn.classList.remove('loading');
      btn.querySelector('.run-text').textContent = 'Run Similarity Analysis';
    }
  }, 60);
}

/* ─── Render Results ─── */
const ALGO_LABELS = {
  cosine: 'Cosine TF-IDF', jaccard: 'Jaccard',
  levenshtein: 'Levenshtein', dice: 'Dice', lcs: 'LCS', ensemble: 'Ensemble'
};

function renderResults() {
  const stats = getPairwiseStats(state.ensemble, state.labels);
  state.allPairs = buildAllAlgoPairs();
  renderSummaryCards(stats);
  renderHeatmap('ensemble');
  renderHeatmapAlgoSelector();
  renderPairsTable();
  renderTopList(stats.pairs);
}

function buildAllAlgoPairs() {
  const n = state.labels.length;
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const row = { i, j, labelA: state.labels[i], labelB: state.labels[j],
        ensemble: state.ensemble[i][j] };
      state.selectedAlgos.forEach(a => { row[a] = state.matrices[a][i][j]; });
      pairs.push(row);
    }
  }
  pairs.sort((a, b) => b.ensemble - a.ensemble);
  return pairs;
}

function renderSummaryCards(stats) {
  const n = state.texts.length;
  const totalPairs = n * (n - 1) / 2;
  document.getElementById('summaryCards').innerHTML = `
    <div class="sum-card"><span class="sum-val">${n}</span><span class="sum-label">Items Compared</span></div>
    <div class="sum-card"><span class="sum-val">${totalPairs}</span><span class="sum-label">Unique Pairs</span></div>
    <div class="sum-card"><span class="sum-val">${pct(stats.avg)}</span><span class="sum-label">Avg Similarity</span></div>
    <div class="sum-card"><span class="sum-val">${pct(stats.max)}</span><span class="sum-label">Max Similarity</span></div>
    <div class="sum-card ${stats.high > 0 ? 'warn' : ''}"><span class="sum-val">${stats.high}</span><span class="sum-label">High Matches (≥70%)</span></div>
    <div class="sum-card"><span class="sum-val">${state.selectedAlgos.length}</span><span class="sum-label">Algorithms Used</span></div>
  `;
}

function renderHeatmapAlgoSelector() {
  const algos = ['ensemble', ...state.selectedAlgos];
  document.getElementById('heatmapAlgoSelector').innerHTML = algos.map(a =>
    `<button class="hm-btn ${a === state.currentHeatmapAlgo ? 'active' : ''}"
      onclick="switchHeatmap('${a}')">${ALGO_LABELS[a] || a}</button>`
  ).join('');
}

function switchHeatmap(algo) {
  state.currentHeatmapAlgo = algo;
  renderHeatmap(algo);
  document.querySelectorAll('.hm-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (ALGO_LABELS[algo] || algo));
  });
  document.getElementById('heatmapAlgoBadge').textContent = ALGO_LABELS[algo] || algo;
}

function renderHeatmap(algo) {
  const matrix = algo === 'ensemble' ? state.ensemble : state.matrices[algo];
  const n = state.labels.length;
  const grid = document.getElementById('heatmapGrid');
  document.getElementById('heatmapAlgoBadge').textContent = ALGO_LABELS[algo] || algo;

  const cellSize = Math.min(56, Math.floor(600 / (n + 1)));
  grid.style.gridTemplateColumns = `repeat(${n + 1}, ${cellSize}px)`;
  grid.style.gridTemplateRows    = `repeat(${n + 1}, ${cellSize}px)`;

  let html = `<div class="hm-cell corner"></div>`;
  // Column headers
  state.labels.forEach(l => {
    html += `<div class="hm-cell hm-header" title="${l}">${l.slice(0, 4)}</div>`;
  });
  // Rows
  for (let i = 0; i < n; i++) {
    html += `<div class="hm-cell hm-header" title="${state.labels[i]}">${state.labels[i].slice(0, 4)}</div>`;
    for (let j = 0; j < n; j++) {
      const v = matrix[i][j];
      const color = scoreColor(v);
      const textColor = v > 0.6 ? '#000' : '#fff';
      html += `<div class="hm-cell hm-data" style="background:${color};color:${textColor}"
        title="${state.labels[i]} vs ${state.labels[j]}: ${pct(v)}">${pct(v)}</div>`;
    }
  }
  grid.innerHTML = html;
}

function renderPairsTable() {
  const algos = ['ensemble', ...state.selectedAlgos];
  document.getElementById('pairsTableHead').innerHTML = `<tr>
    <th>Pair A</th><th>Pair B</th>
    ${algos.map(a => `<th>${ALGO_LABELS[a] || a}</th>`).join('')}
    <th>Risk</th>
  </tr>`;
  renderPairsRows(0);
}

function renderPairsRows(threshold) {
  const algos = ['ensemble', ...state.selectedAlgos];
  const filtered = state.allPairs.filter(p => p.ensemble >= threshold / 100);
  document.getElementById('pairsTableBody').innerHTML = filtered.map(p => {
    const risk = p.ensemble >= 0.8 ? 'high' : p.ensemble >= 0.5 ? 'med' : 'low';
    return `<tr>
      <td class="pair-label">${p.labelA}</td>
      <td class="pair-label">${p.labelB}</td>
      ${algos.map(a => `<td><span class="score-chip ${chipClass(p[a] || 0)}">${pct(p[a] || 0)}</span></td>`).join('')}
      <td><span class="risk-badge ${risk}">${risk.toUpperCase()}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="${algos.length + 3}" class="empty-row">No pairs above threshold</td></tr>`;
}

function filterPairs(val) {
  document.getElementById('thresholdVal').textContent = val + '%';
  renderPairsRows(Number(val));
}

function renderTopList(pairs) {
  const top = pairs.slice(0, 5);
  document.getElementById('topList').innerHTML = top.map((p, rank) => `
    <div class="top-item">
      <span class="top-rank">#${rank + 1}</span>
      <div class="top-labels">
        <span class="tl">${p.labelA}</span>
        <span class="vs">vs</span>
        <span class="tl">${p.labelB}</span>
      </div>
      <div class="top-bar-wrap">
        <div class="top-bar" style="width:${pct(p.score)};background:${scoreColor(p.score)}"></div>
      </div>
      <span class="top-score" style="color:${scoreColor(p.score)}">${pct(p.score)}</span>
    </div>
  `).join('');
}

/* ─── Export CSV ─── */
function downloadCSV() {
  const algos = ['ensemble', ...state.selectedAlgos];
  const header = ['Pair A', 'Pair B', ...algos.map(a => ALGO_LABELS[a] || a)].join(',');
  const rows = state.allPairs.map(p =>
    [p.labelA, p.labelB, ...algos.map(a => (p[a] || 0).toFixed(4))].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: 'similarity_results.csv'
  });
  a.click();
}

/* ─── Helpers ─── */
function pct(v) { return Math.round((v || 0) * 100) + '%'; }
function chipClass(v) { return v >= 0.7 ? 'chip-high' : v >= 0.4 ? 'chip-med' : 'chip-low'; }
function scoreColor(v) {
  // green → yellow → red scale
  if (v >= 0.8) return '#ef4444';
  if (v >= 0.6) return '#f97316';
  if (v >= 0.4) return '#eab308';
  if (v >= 0.2) return '#22c55e';
  return '#3b82f6';
}

function show(id, visible) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden', !visible);
}

function resetApp() {
  state = { rawData: null, labels: [], texts: [], field: null, fields: [],
    matrices: null, ensemble: null, selectedAlgos: [], currentHeatmapAlgo: 'ensemble', allPairs: [] };
  show('uploadSection', true);
  show('configSection', false);
  show('resultsSection', false);
  document.getElementById('fileInput').value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}