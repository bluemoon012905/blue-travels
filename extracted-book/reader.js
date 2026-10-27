const editions = {
  english: { label: 'English translation', file: 'english.md' },
  traditional: { label: '繁體中文 · Traditional Chinese', file: 'chinese-traditional.md' },
  simplified: { label: '简体中文 · Simplified Chinese', file: 'chinese-simplified.md' },
};

const pageElement = document.querySelector('#book-page');
const editionSelect = document.querySelector('#edition-select');
const currentElement = document.querySelector('#page-current');
const totalElement = document.querySelector('#page-total');
const pageInput = document.querySelector('#page-input');
const previousButton = document.querySelector('#previous-page');
const nextButton = document.querySelector('#next-page');
const pagesByEdition = new Map();
let currentEdition = new URLSearchParams(window.location.search).get('edition') || 'english';
let currentPage = Number(new URLSearchParams(window.location.search).get('page')) || 1;

function parsePages(markdown) {
  const pages = [];
  const pattern = /## Scan page (\d+)\s*\n\s*([\s\S]*?)(?=\n\s*---\s*\n\s*## Scan page|$)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    const text = match[2].trim();
    pages.push({ number: Number(match[1]), text });
  }
  return pages;
}

function cleanPageText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/^[| ]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderPage() {
  const pages = pagesByEdition.get(currentEdition) || [];
  if (!pages.length) return;
  currentPage = Math.max(1, Math.min(currentPage, pages.length));
  const page = pages[currentPage - 1];
  const paragraphs = cleanPageText(page.text)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');
  pageElement.innerHTML = `<p class="page-heading">${editions[currentEdition].label} · scan page ${page.number}</p><div class="page-text">${paragraphs}</div>`;
  currentElement.textContent = String(currentPage);
  totalElement.textContent = String(pages.length);
  pageInput.value = String(currentPage);
  pageInput.max = String(pages.length);
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= pages.length;
  document.title = `Hesitation · ${editions[currentEdition].label} · page ${currentPage}`;
  history.replaceState(null, '', `?edition=${encodeURIComponent(currentEdition)}&page=${currentPage}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

async function loadEdition(edition) {
  currentEdition = editions[edition] ? edition : 'english';
  if (!pagesByEdition.has(currentEdition)) {
    const response = await fetch(editions[currentEdition].file);
    if (!response.ok) throw new Error(`Could not load ${editions[currentEdition].file}`);
    pagesByEdition.set(currentEdition, parsePages(await response.text()));
  }
  currentPage = Math.max(1, Math.min(currentPage, pagesByEdition.get(currentEdition).length));
  editionSelect.value = currentEdition;
  renderPage();
}

function showError(error) {
  pageElement.innerHTML = `<p class="error">${escapeHtml(error.message || String(error))}</p>`;
}

previousButton.addEventListener('click', () => { if (currentPage > 1) { currentPage -= 1; renderPage(); } });
nextButton.addEventListener('click', () => { const pages = pagesByEdition.get(currentEdition) || []; if (currentPage < pages.length) { currentPage += 1; renderPage(); } });
editionSelect.addEventListener('change', () => { currentPage = 1; loadEdition(editionSelect.value).catch(showError); });
pageInput.addEventListener('change', () => { currentPage = Number(pageInput.value) || 1; renderPage(); });
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select')) return;
  if (event.key === 'ArrowLeft' && currentPage > 1) { currentPage -= 1; renderPage(); }
  if (event.key === 'ArrowRight') { const pages = pagesByEdition.get(currentEdition) || []; if (currentPage < pages.length) { currentPage += 1; renderPage(); } }
});

loadEdition(currentEdition).catch(showError);
