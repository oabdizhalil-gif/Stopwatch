const STORAGE_KEY = 'compass-plus-spa-v1';

const seedData = {
  sections: [
    {
      id: crypto.randomUUID(),
      title: 'The present simple',
      subtitle: 'Grammar - to be',
      blocks: [
        {
          id: crypto.randomUUID(),
          title: 'Sam and Jam',
          level: 'A0',
          text: 'There was a boy named Art. He loved a girl named Ellie. Once he decided to tell Ellie that he is in love with her. But he thought Ellie might not like him.'
        },
        {
          id: crypto.randomUUID(),
          title: 'My father',
          level: 'A0',
          text: 'My father is kind and strong. He works every day and helps our family. In the evening we drink tea and talk about school.'
        }
      ]
    }
  ]
};

const state = {
  data: loadData(),
  route: { page: 'home' },
  activeWordElement: null
};

const app = document.getElementById('app');
const popup = document.getElementById('wordPopup');

document.getElementById('menuBtn').addEventListener('click', () => navigate({ page: 'admin' }));
document.getElementById('logoBtn').addEventListener('click', () => navigate({ page: 'home' }));
document.addEventListener('click', (event) => {
  if (!popup.contains(event.target) && !event.target.classList.contains('word')) {
    hidePopup();
  }
});

render();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedData);
  try {
    const parsed = JSON.parse(raw);
    return parsed?.sections?.length ? parsed : structuredClone(seedData);
  } catch {
    return structuredClone(seedData);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function navigate(route) {
  state.route = route;
  hidePopup();
  render();
}

function render() {
  app.innerHTML = '';
  removeOldRail();

  if (state.route.page === 'home') renderHome();
  if (state.route.page === 'reading') renderReading();
  if (state.route.page === 'admin') renderAdmin();
  if (state.route.page === 'editor') renderEditor();

  addScrollRail();
}

function renderHome() {
  app.innerHTML = `
    <h1>Sections</h1>
    <p class="subtitle">Choose a block to start reading.</p>
  `;

  state.data.sections.forEach((section) => {
    const sectionNode = document.createElement('section');
    sectionNode.className = 'section';

    const blocks = section.blocks
      .map((block, idx) => blockCardHTML(block, idx + 1, `data-open-block="${block.id}"`))
      .join('');

    sectionNode.innerHTML = `
      <div class="section-header">
        <div>
          <h2>${escape(section.title)}</h2>
          <p class="subtitle">${escape(section.subtitle || '')}</p>
        </div>
      </div>
      <div class="blocks-grid">${blocks}</div>
    `;

    app.appendChild(sectionNode);
  });

  app.querySelectorAll('[data-open-block]').forEach((el) => {
    el.addEventListener('click', () => {
      const block = findBlock(el.dataset.openBlock);
      if (!block) return;
      navigate({ page: 'reading', blockId: block.id });
    });
  });
}

function renderReading() {
  const block = findBlock(state.route.blockId);
  if (!block) return navigate({ page: 'home' });

  const section = findSectionByBlock(block.id);

  app.innerHTML = `
    <h1>${escape(block.title)}</h1>
    <p class="subtitle">${escape(section?.subtitle || '')}</p>
    <article class="reading-text" id="readingText"></article>
    <div class="reading-nav">
      <button class="triangle prev" id="prevBlock" title="Previous"></button>
      <button class="triangle next" id="nextBlock" title="Next"></button>
    </div>
  `;

  const article = document.getElementById('readingText');
  article.append(...createWordNodes(block.text));

  article.querySelectorAll('.word').forEach((wordNode) => {
    wordNode.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (state.activeWordElement) state.activeWordElement.classList.remove('active-word');
      state.activeWordElement = wordNode;
      wordNode.classList.add('active-word');

      const word = wordNode.dataset.word;
      showPopup(event.clientX, event.clientY, `Loading “${word}”...`);
      const definition = await fetchKyrgyzDefinition(word);
      showPopup(event.clientX, event.clientY, `<strong>${escape(word)}</strong><br>${escape(definition)}`);
    });
  });

  const flatBlocks = state.data.sections.flatMap((s) => s.blocks);
  const currentIndex = flatBlocks.findIndex((b) => b.id === block.id);
  document.getElementById('prevBlock').onclick = () => {
    const prev = flatBlocks[currentIndex - 1];
    if (prev) navigate({ page: 'reading', blockId: prev.id });
  };
  document.getElementById('nextBlock').onclick = () => {
    const next = flatBlocks[currentIndex + 1];
    if (next) navigate({ page: 'reading', blockId: next.id });
  };
}

function renderAdmin() {
  app.innerHTML = `
    <h1>Admin panel</h1>
    <p class="subtitle">Create sections, add blocks, and manage reading texts.</p>
    <section class="admin-card">
      <input class="input" id="sectionTitle" placeholder="Section title" />
      <input class="input" id="sectionSubtitle" placeholder="Section subtitle" />
      <button class="btn btn-primary" id="addSectionBtn">Add section</button>
    </section>
  `;

  state.data.sections.forEach((section) => {
    const card = document.createElement('section');
    card.className = 'admin-card';
    const blocks = section.blocks
      .map((block, idx) => {
        return `
          <div>
            ${blockCardHTML(block, idx + 1, `data-edit-block="${block.id}"`)}
            <div class="block-actions">
              <button class="btn btn-soft" data-edit-block="${block.id}">Edit text</button>
              <button class="btn btn-danger" data-delete-block="${block.id}">Delete block</button>
            </div>
          </div>
        `;
      })
      .join('');

    card.innerHTML = `
      <div class="section-header">
        <div>
          <h2>${escape(section.title)}</h2>
          <p>${escape(section.subtitle || '')}</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-danger" data-delete-section="${section.id}">Delete section</button>
        </div>
      </div>
      <div class="admin-actions">
        <button class="btn btn-primary" data-add-block="${section.id}">+ Add block</button>
      </div>
      <div class="blocks-grid">${blocks}</div>
    `;
    app.appendChild(card);
  });

  document.getElementById('addSectionBtn').onclick = () => {
    const title = document.getElementById('sectionTitle').value.trim();
    const subtitle = document.getElementById('sectionSubtitle').value.trim();
    if (!title) return;

    state.data.sections.push({ id: crypto.randomUUID(), title, subtitle, blocks: [] });
    persist();
    render();
  };

  wireAdminEvents();
}

function wireAdminEvents() {
  app.querySelectorAll('[data-delete-section]').forEach((btn) => {
    btn.onclick = () => {
      state.data.sections = state.data.sections.filter((s) => s.id !== btn.dataset.deleteSection);
      persist();
      render();
    };
  });

  app.querySelectorAll('[data-add-block]').forEach((btn) => {
    btn.onclick = () => {
      const section = state.data.sections.find((s) => s.id === btn.dataset.addBlock);
      if (!section) return;
      const nextNo = section.blocks.length + 1;
      section.blocks.push({
        id: crypto.randomUUID(),
        title: `Story ${nextNo}`,
        level: 'A0',
        text: 'Write text here...'
      });
      persist();
      render();
    };
  });

  app.querySelectorAll('[data-edit-block]').forEach((btn) => {
    btn.onclick = () => navigate({ page: 'editor', blockId: btn.dataset.editBlock });
  });

  app.querySelectorAll('[data-delete-block]').forEach((btn) => {
    btn.onclick = () => {
      state.data.sections.forEach((section) => {
        section.blocks = section.blocks.filter((b) => b.id !== btn.dataset.deleteBlock);
      });
      persist();
      render();
    };
  });
}

function renderEditor() {
  const block = findBlock(state.route.blockId);
  if (!block) return navigate({ page: 'admin' });

  app.innerHTML = `
    <h1>Edit block</h1>
    <p class="subtitle">Update title, level and text for this reading block.</p>

    <section class="admin-card">
      <input class="input" id="editTitle" value="${escapeAttr(block.title)}" />
      <input class="input" id="editLevel" value="${escapeAttr(block.level)}" />
      <textarea class="textarea" id="editText">${escape(block.text)}</textarea>
      <div class="editor-actions">
        <button class="btn btn-primary" id="saveBlockBtn">Save</button>
        <button class="btn btn-danger" id="removeBlockBtn">Remove</button>
        <button class="btn btn-soft" id="backToAdminBtn">Back</button>
      </div>
    </section>
  `;

  document.getElementById('saveBlockBtn').onclick = () => {
    block.title = document.getElementById('editTitle').value.trim() || 'Untitled';
    block.level = document.getElementById('editLevel').value.trim() || 'A0';
    block.text = document.getElementById('editText').value.trim() || 'No text yet.';
    persist();
    navigate({ page: 'admin' });
  };

  document.getElementById('removeBlockBtn').onclick = () => {
    state.data.sections.forEach((section) => {
      section.blocks = section.blocks.filter((b) => b.id !== block.id);
    });
    persist();
    navigate({ page: 'admin' });
  };

  document.getElementById('backToAdminBtn').onclick = () => navigate({ page: 'admin' });
}

function blockCardHTML(block, index, attrs = '') {
  return `
    <button class="block-card" ${attrs} type="button">
      <div class="block-index">#${index}</div>
      <div class="block-level">${escape(block.level || 'A0')}</div>
      <div class="block-title">${escape(block.title || 'Untitled')}</div>
    </button>
  `;
}

function createWordNodes(text) {
  const fragment = document.createDocumentFragment();
  const tokens = text.split(/(\s+)/);

  tokens.forEach((token) => {
    if (!token.trim()) {
      fragment.append(document.createTextNode(token));
      return;
    }

    const clearWord = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!clearWord) {
      fragment.append(document.createTextNode(token));
      return;
    }

    const span = document.createElement('span');
    span.className = 'word';
    span.dataset.word = clearWord;
    span.textContent = token;
    fragment.append(span);
  });

  return [fragment];
}

async function fetchKyrgyzDefinition(word) {
  try {
    const dictionaryRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!dictionaryRes.ok) throw new Error('Definition lookup failed');
    const dictionaryJson = await dictionaryRes.json();
    const english = dictionaryJson?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    if (!english) throw new Error('No English definition found');

    const translated = await translateToKyrgyz(english);
    return translated || `${english} (KG translation unavailable right now)`;
  } catch {
    return 'Аныктама табылган жок. Интернет байланышын же башка API булагын текшериңиз.';
  }
}

async function translateToKyrgyz(text) {
  try {
    const response = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|ky');
    const data = await response.json();
    return data?.responseData?.translatedText;
  } catch {
    return null;
  }
}

function findBlock(blockId) {
  for (const section of state.data.sections) {
    const found = section.blocks.find((b) => b.id === blockId);
    if (found) return found;
  }
  return null;
}

function findSectionByBlock(blockId) {
  return state.data.sections.find((section) => section.blocks.some((block) => block.id === blockId));
}

function showPopup(x, y, html) {
  popup.innerHTML = html;
  popup.classList.remove('hidden');
  popup.style.left = `${Math.min(x + 16, window.innerWidth - 340)}px`;
  popup.style.top = `${Math.max(y - 20, 95)}px`;
}

function hidePopup() {
  popup.classList.add('hidden');
  if (state.activeWordElement) {
    state.activeWordElement.classList.remove('active-word');
    state.activeWordElement = null;
  }
}

function addScrollRail() {
  const template = document.getElementById('scrollRailTemplate');
  const rail = template.content.firstElementChild.cloneNode(true);
  rail.id = 'scrollRail';
  document.body.appendChild(rail);

  rail.querySelectorAll('.scroll-arrow').forEach((btn) => {
    btn.onclick = () => {
      const dir = btn.dataset.dir === 'up' ? -1 : 1;
      window.scrollBy({ top: dir * 240, behavior: 'smooth' });
    };
  });
}

function removeOldRail() {
  const existing = document.getElementById('scrollRail');
  if (existing) existing.remove();
}

function escape(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
  return escape(str).replaceAll('`', '&#96;');
}
