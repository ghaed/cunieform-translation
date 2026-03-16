/* ============================================================
   Cuneiform Translation Portal – Frontend
   ============================================================ */

'use strict';

// ---- State ----
let tablets = [];           // array of tablet metadata objects
let currentTablet = null;   // currently selected tablet metadata
let currentData = null;     // last translation API response

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
      const trText = document.createElement('span');
      if (sec.translation) {
        trText.className = 'tr-text';
        trText.textContent = sec.translation;
      } else {
        trText.className = 'tr-placeholder';
        trText.textContent = '—';
      }
      trRow.appendChild(trText);

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
// Start
// ============================================================

init();
