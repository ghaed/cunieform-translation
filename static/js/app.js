/* ============================================================
   Cuneiform Translation Portal – Frontend
   ============================================================ */

'use strict';

// ---- State ----
let tablets = [];           // array of tablet metadata objects
let currentTablet = null;   // currently selected tablet metadata
let currentData = null;     // last translation API response

// ---- Expert mode state ----
let expertMode = false;
let expertVerdicts = {};    // idx -> { verdict: 'correct'|'incorrect', proposed: '' }

// ---- DOM refs ----
const selectEl        = document.getElementById('tablet-select');
const translateBtn    = document.getElementById('translate-btn');
const tabletCard      = document.getElementById('tablet-card');
const tabletImg       = document.getElementById('tablet-img');
const imgFallback     = document.getElementById('img-fallback');
const tabletCdliId    = document.getElementById('tablet-cdli-id');
const tabletTitleH    = document.getElementById('tablet-title');
const tabletDesc      = document.getElementById('tablet-description');
const metaPeriod      = document.getElementById('meta-period');
const metaProvenance  = document.getElementById('meta-provenance');
const metaGenre       = document.getElementById('meta-genre');
const cdliLink        = document.getElementById('cdli-link');
const loadingBanner   = document.getElementById('loading-banner');
const statusBanner    = document.getElementById('status-banner');
const outputSection   = document.getElementById('output-section');
const outputName      = document.getElementById('output-tablet-name');
const outputTitle     = document.getElementById('output-tablet-title');
const clearCacheBtn   = document.getElementById('clear-cache-btn');
const atfContent      = document.getElementById('atf-content');
const translContent   = document.getElementById('translation-content');

// ---- Expert mode DOM refs ----
const expertToggle      = document.getElementById('expert-toggle');
const expertSubmitBar   = document.getElementById('expert-submit-bar');
const expertVerdictCount = document.getElementById('expert-verdict-count');
const expertTabletNameEl = document.getElementById('expert-tablet-name');
const expertNameInput   = document.getElementById('expert-name');
const expertEmailInput  = document.getElementById('expert-email');
const expertSubmitBtn   = document.getElementById('expert-submit-btn');

// ============================================================
// Boot
// ============================================================

async function init() {
  try {
    const res = await fetch('/api/tablets');
    tablets = await res.json();
    populateDropdown();
  } catch (e) {
    showStatus('err', 'Could not load tablet list. Is the server running?');
  }
}

function populateDropdown() {
  tablets.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.id}  —  ${t.title}`;
    selectEl.appendChild(opt);
  });
}

// ============================================================
// Event listeners
// ============================================================

selectEl.addEventListener('change', () => {
  const id = selectEl.value;
  if (!id) {
    currentTablet = null;
    hide(tabletCard);
    translateBtn.disabled = true;
    return;
  }
  currentTablet = tablets.find(t => t.id === id);
  showTabletCard(currentTablet);
  translateBtn.disabled = false;
});

translateBtn.addEventListener('click', async () => {
  if (!currentTablet) return;
  await doTranslate(currentTablet.id);
});

clearCacheBtn.addEventListener('click', async () => {
  if (!currentTablet) return;
  try {
    await fetch(`/api/cache/clear/${currentTablet.id}`, { method: 'DELETE' });
  } catch {}
  await doTranslate(currentTablet.id);
});

// ============================================================
// Tablet card
// ============================================================

function showTabletCard(t) {
  tabletCdliId.textContent   = t.id + '  ·  ' + t.name;
  tabletTitleH.textContent   = t.title;
  tabletDesc.textContent     = t.description;
  metaPeriod.textContent     = t.period;
  metaProvenance.textContent = t.provenance || '—';
  metaGenre.textContent      = t.genre;
  cdliLink.href              = `https://cdli.mpiwg-berlin.mpg.de/artifacts/${t.id}`;

  // Load tablet image
  const imageUrl = t.image_url || `/static/img/tablet-placeholder.svg`;
  tabletImg.style.display = 'block';
  imgFallback.style.display = 'none';
  tabletImg.src = imageUrl;
  tabletImg.onerror = () => {
    tabletImg.src = '/static/img/tablet-placeholder.svg';
    tabletImg.onerror = null;
  };

  show(tabletCard);
}

// ============================================================
// Translation
// ============================================================

async function doTranslate(tabletId) {
  hideStatus();
  hide(outputSection);
  show(loadingBanner);
  translateBtn.disabled = true;
  expertVerdicts = {};
  hide(expertSubmitBar);

  try {
    const res = await fetch(`/api/translate/${tabletId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ description: res.statusText }));
      throw new Error(err.description || res.statusText);
    }
    currentData = await res.json();
    renderOutput(currentData);
  } catch (e) {
    showStatus('err', `Translation failed: ${e.message}`);
  } finally {
    hide(loadingBanner);
    translateBtn.disabled = false;
  }
}

// ============================================================
// Render output
// ============================================================

function renderOutput(data) {
  outputName.textContent  = data.name;
  outputTitle.textContent = data.title || '';

  atfContent.innerHTML     = '';
  translContent.innerHTML  = '';

  const sections = data.sections || [];

  sections.forEach((sec, idx) => {
    const atfRow  = document.createElement('div');
    const trRow   = document.createElement('div');
    atfRow.dataset.idx = idx;
    trRow.dataset.idx  = idx;

    if (sec.type === 'content') {
      // Numbered line with translation
      atfRow.className = 'atf-row content-row atf-type-content';

      const numEl = document.createElement('span');
      numEl.className = 'atf-linenum';
      numEl.textContent = sec.number + '.';

      const textEl = document.createElement('span');
      textEl.className = 'atf-text';
      textEl.innerHTML = highlightATF(sec.content);

      atfRow.appendChild(numEl);
      atfRow.appendChild(textEl);

      trRow.className = 'tr-row';

      // tr-main: translation text + verdict buttons (side by side)
      const trMain = document.createElement('div');
      trMain.className = 'tr-main';

      const trText = document.createElement('span');
      if (sec.translation) {
        trText.className = 'tr-text';
        trText.textContent = sec.translation;
      } else {
        trText.className = 'tr-placeholder';
        trText.textContent = '—';
      }
      trMain.appendChild(trText);

      // Verdict controls (hidden until expert mode via CSS)
      const vControls = document.createElement('span');
      vControls.className = 'verdict-controls';
      vControls.innerHTML =
        `<button class="vbtn vbtn-ok" data-idx="${idx}" title="Mark correct">✓</button>` +
        `<button class="vbtn vbtn-no" data-idx="${idx}" title="Mark incorrect">✗</button>`;
      trMain.appendChild(vControls);

      trRow.appendChild(trMain);

      // Correction textarea (shown when line is marked incorrect)
      const corrInput = document.createElement('textarea');
      corrInput.className = 'correction-input hidden';
      corrInput.dataset.correctionFor = idx;
      corrInput.placeholder = 'Proposed translation…';
      corrInput.rows = 2;
      trRow.appendChild(corrInput);

      // Hover sync
      [atfRow, trRow].forEach(el => {
        el.addEventListener('mouseenter', () => highlightPair(idx, true));
        el.addEventListener('mouseleave', () => highlightPair(idx, false));
      });

    } else {
      // Metadata / structural line – only shown in ATF column
      atfRow.className = `atf-row atf-type-${sec.type}`;

      const textEl = document.createElement('span');
      textEl.className = 'atf-text';
      textEl.textContent = sec.content;
      atfRow.appendChild(textEl);

      // Blank placeholder in translation column
      trRow.className = 'tr-row tr-empty';
    }

    atfContent.appendChild(atfRow);
    translContent.appendChild(trRow);
  });

  // Status message
  const statusMsg = buildStatusMessage(data);
  if (statusMsg) {
    showStatus(statusMsg.type, statusMsg.text);
  } else {
    hideStatus();
  }

  show(outputSection);
}

// ============================================================
// ATF syntax highlighting
// ============================================================

function highlightATF(text) {
  if (!text) return '';
  // Escape HTML first
  let s = escapeHtml(text);

  // Determinatives: {d}, {ki}, {gesz}, {munus}, {disz}, etc.
  s = s.replace(/\{[^}]+\}/g, m =>
    `<span class="det">${m}</span>`
  );

  // Broken / restored text: [...] or &lt;...&gt;
  s = s.replace(/\[[^\]]*\]/g, m =>
    `<span class="broken">${m}</span>`
  );
  s = s.replace(/&lt;[^&]*&gt;/g, m =>
    `<span class="broken">${m}</span>`
  );

  // Uncertain forms: word# or word#-word (the # marker)
  s = s.replace(/(\S+)#/g, (_, w) =>
    `<span class="uncertain">${w}#</span>`
  );

  // Unknown signs: standalone x or x-x
  s = s.replace(/\bx\b/g, '<span class="unknown">x</span>');

  return s;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Pair hover highlight
// ============================================================

function highlightPair(idx, on) {
  const bg = on ? 'rgba(200,152,72,.07)' : '';
  const atfEl = atfContent.querySelector(`[data-idx="${idx}"]`);
  const trEl  = translContent.querySelector(`[data-idx="${idx}"]`);
  if (atfEl) atfEl.style.background = bg;
  if (trEl)  trEl.style.background  = bg;
}

// ============================================================
// Status banner
// ============================================================

function buildStatusMessage(data) {
  switch (data.status) {
    case 'translated':
      return {
        type: 'ok',
        text: `✓ Translation complete — ${data.translation_count} lines translated by the ML pipeline.`
              + (data.timestamp ? `  (cached ${formatTimestamp(data.timestamp)})` : ''),
      };
    case 'no_translation_model':
      return {
        type: 'warn',
        text: '⚠ Translation model (Back_Translation.pt) not found. '
            + 'Download it from the CDLI S3 bucket and place it in '
            + 'Sumerian-Translation-Pipeline/Translation_Models/. '
            + 'ATF structure is displayed; English translations are unavailable.',
      };
    case 'no_pos_model':
      return {
        type: 'warn',
        text: '⚠ POS model not found. Run the pipeline setup steps in the README.',
      };
    case 'pipeline_failed':
      return {
        type: 'err',
        text: '✕ Pipeline ran but produced no output. Check that all dependencies '
            + '(sklearn_crfsuite, OpenNMT-py) are installed.',
      };
    case 'timeout':
      return { type: 'err', text: '✕ Pipeline timed out after 6 minutes.' };
    case 'error':
      return { type: 'err', text: '✕ An error occurred while running the pipeline.' };
    default:
      return null;
  }
}

function formatTimestamp(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

function showStatus(type, text) {
  statusBanner.className   = `status-banner ${type}`;
  statusBanner.textContent = text;
  show(statusBanner);
}
function hideStatus() { hide(statusBanner); }

// ============================================================
// Helpers
// ============================================================

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ============================================================
// Expert mode
// ============================================================

expertToggle.addEventListener('click', e => {
  e.preventDefault();
  expertMode = !expertMode;
  document.body.classList.toggle('expert-mode', expertMode);
  expertToggle.textContent = expertMode ? 'exit scholar mode' : 'scholar mode';
  if (!expertMode) {
    clearExpertUI();
    expertVerdicts = {};
    hide(expertSubmitBar);
  }
});

// Event delegation — verdict buttons
translContent.addEventListener('click', e => {
  if (!expertMode) return;
  const btn = e.target.closest('.vbtn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx);
  const verdict = btn.classList.contains('vbtn-ok') ? 'correct' : 'incorrect';
  setVerdict(idx, verdict);
});

// Event delegation — correction textarea
translContent.addEventListener('input', e => {
  if (!expertMode) return;
  const ta = e.target.closest('.correction-input');
  if (!ta) return;
  const idx = parseInt(ta.dataset.correctionFor);
  if (expertVerdicts[idx]) {
    expertVerdicts[idx].proposed = ta.value;
  }
  updateSubmitBar();
});

expertSubmitBtn.addEventListener('click', submitExpertFeedback);

function setVerdict(idx, verdict) {
  const trRow = translContent.querySelector(`[data-idx="${idx}"]`);
  if (!trRow) return;

  // Toggle off if same verdict clicked again
  if (expertVerdicts[idx] && expertVerdicts[idx].verdict === verdict) {
    delete expertVerdicts[idx];
    trRow.classList.remove('verdict-correct', 'verdict-incorrect');
    const ta = trRow.querySelector('.correction-input');
    if (ta) { ta.classList.add('hidden'); ta.value = ''; }
  } else {
    const prev = expertVerdicts[idx] || {};
    expertVerdicts[idx] = { verdict, proposed: prev.proposed || '' };
    trRow.classList.toggle('verdict-correct',  verdict === 'correct');
    trRow.classList.toggle('verdict-incorrect', verdict === 'incorrect');
    const ta = trRow.querySelector('.correction-input');
    if (ta) {
      ta.classList.toggle('hidden', verdict !== 'incorrect');
      if (verdict === 'incorrect' && expertVerdicts[idx].proposed) {
        ta.value = expertVerdicts[idx].proposed;
      } else if (verdict !== 'incorrect') {
        ta.value = '';
      }
    }
  }

  // Sync button active states
  const okBtn = trRow.querySelector('.vbtn-ok');
  const noBtn = trRow.querySelector('.vbtn-no');
  if (okBtn) okBtn.classList.toggle('active', expertVerdicts[idx]?.verdict === 'correct');
  if (noBtn) noBtn.classList.toggle('active', expertVerdicts[idx]?.verdict === 'incorrect');

  updateSubmitBar();
}

function updateSubmitBar() {
  const count = Object.keys(expertVerdicts).length;
  if (count === 0 || !currentData) { hide(expertSubmitBar); return; }
  expertVerdictCount.textContent = count;
  expertTabletNameEl.textContent = currentData.name || currentData.tablet_id;
  show(expertSubmitBar);
}

function clearExpertUI() {
  translContent.querySelectorAll('.tr-row').forEach(row => {
    row.classList.remove('verdict-correct', 'verdict-incorrect');
    const ta = row.querySelector('.correction-input');
    if (ta) { ta.classList.add('hidden'); ta.value = ''; }
    row.querySelectorAll('.vbtn').forEach(b => b.classList.remove('active'));
  });
}

async function submitExpertFeedback() {
  if (!currentData) return;

  const lines = Object.entries(expertVerdicts).map(([idx, v]) => {
    const sec = currentData.sections[parseInt(idx)];
    return {
      line_number:          sec?.number || '',
      atf_content:          sec?.content || '',
      original_translation: sec?.translation || '',
      verdict:              v.verdict,
      proposed_translation: v.proposed || '',
    };
  });

  const payload = {
    tablet_id:      currentData.tablet_id,
    lines,
    reviewer_name:  expertNameInput.value.trim(),
    reviewer_email: expertEmailInput.value.trim(),
  };

  expertSubmitBtn.disabled    = true;
  expertSubmitBtn.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Server error');

    expertVerdicts = {};
    expertNameInput.value  = '';
    expertEmailInput.value = '';
    hide(expertSubmitBar);
    clearExpertUI();
    showStatus('ok', `✓ Review submitted — ${lines.length} line(s). Thank you for your contribution.`);
  } catch {
    showStatus('err', '✕ Failed to submit review. Please try again.');
  } finally {
    expertSubmitBtn.disabled    = false;
    expertSubmitBtn.textContent = 'Publish Review';
  }
}

// ============================================================
// Start
// ============================================================

init();
