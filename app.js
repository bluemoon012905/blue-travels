const appScript = document.currentScript;
const siteRoot = new URL('.', appScript?.src || window.location.href);
const isLocalEnvironment = window.location.protocol === 'file:'
  || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

function ensureRadioMarkup() {
  if (document.querySelector('[data-radio-audio]')) return;

  const sketchSource = new URL('assets/radio/images/radio-sketch.jpg', siteRoot).href;
  const turtleSource = new URL('assets/radio/images/radio-turtle.jpg', siteRoot).href;
  const debugMarkup = isLocalEnvironment ? `
    <button class="radio-debug" type="button" data-radio-debug aria-expanded="false">debug</button>
    <button class="radio-debug-next" type="button" data-radio-debug-next hidden>next song</button>
    <pre class="radio-debug-output" data-radio-debug-output hidden></pre>
  ` : '';
  document.body.insertAdjacentHTML('afterbegin', `
    <section class="radio-console" aria-label="Blue FM radio" data-radio-console>
      <div class="radio-console-topline" aria-hidden="true">
        <span class="radio-light"></span>
        <span class="radio-kicker">Blue FM / shortwave</span>
        <span class="radio-status" data-radio-status>off air</span>
      </div>
      <div class="radio-console-main">
        <button class="radio-toggle" type="button" data-radio-toggle aria-label="Turn on Blue FM" aria-pressed="false">
          <span class="radio-sketch" aria-hidden="true">
            <span class="radio-paper radio-paper-1"></span>
            <span class="radio-paper radio-paper-2"></span>
            <span class="radio-paper radio-paper-3"></span>
            <span class="radio-paper radio-paper-4"></span>
            <span class="radio-drawing radio-drawing-1"><img src="${sketchSource}" alt="" /></span>
            <span class="radio-drawing radio-drawing-2"><img src="${sketchSource}" alt="" /></span>
            <span class="radio-drawing radio-drawing-3"><img src="${sketchSource}" alt="" /></span>
            <span class="radio-drawing radio-drawing-4"><img src="${sketchSource}" alt="" /></span>
          </span>
          <span class="radio-action" data-radio-action>turn on</span>
        </button>
        <p class="radio-track" data-radio-track>silence between stations</p>
      </div>
      <p class="radio-note" data-radio-note>Turn it on when you feel like company.</p>
      <audio data-radio-audio preload="none"></audio>
    </section>
    <button class="radio-turtle" type="button" data-radio-next aria-label="Skip to next song">
      <img src="${turtleSource}" alt="" />
    </button>
    ${debugMarkup}
  `);
}

ensureRadioMarkup();

function initializeMap() {
  const mapVisual = document.querySelector('.map-visual');
  const markedLocations = [...document.querySelectorAll('.city[data-map-x][data-map-y]')];

  if (!mapVisual || !markedLocations.length) return;

  const x = markedLocations.reduce((total, location) => total + Number(location.dataset.mapX), 0) / markedLocations.length;
  const y = markedLocations.reduce((total, location) => total + Number(location.dataset.mapY), 0) / markedLocations.length;
  mapVisual.style.setProperty('--focus-x', `${x}%`);
  mapVisual.style.setProperty('--focus-y', `${y}%`);

  const mapCard = mapVisual.closest('.real-map-card');
  const editorToggle = document.querySelector('[data-map-editor-toggle]');
  const editor = document.querySelector('[data-map-editor]');
  const scaleInput = document.querySelector('[data-map-scale]');
  const scaleOutput = document.querySelector('[data-map-scale-output]');
  const chineseFontInput = document.querySelector('[data-city-font-chinese]');
  const englishFontInput = document.querySelector('[data-city-font-english]');
  const resetButton = document.querySelector('[data-map-reset]');
  const clearButton = document.querySelector('[data-map-clear]');
  const editorMode = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    || new URLSearchParams(window.location.search).has('edit-map');
  // Bump this when publishing a new source layout so stale browser-local
  // coordinates cannot keep overriding the production default.
  const layoutKey = 'blue-travels.map.layout.v2';
  const fontSettingsKey = 'blue-travels.map.fonts';
  const fontStacks = {
    chinese: {
      'system-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif",
      'noto-sans-cjk': "'Noto Sans CJK SC', 'Noto Sans SC', sans-serif",
      'noto-serif-cjk': "'Noto Serif CJK SC', 'Noto Serif SC', serif",
      'source-han-sans': "'Source Han Sans SC', 'Source Han Sans CN', sans-serif",
      'source-han-serif': "'Source Han Serif SC', 'Source Han Serif CN', serif",
      'microsoft-yahei': "'Microsoft YaHei', '微软雅黑', sans-serif",
      simsun: "SimSun, '宋体', serif",
      kaiti: "KaiTi, '楷体', serif",
    },
    english: {
      'dm-sans': "'DM Sans', Arial, sans-serif",
      'dm-mono': "'DM Mono', monospace",
      playfair: "'Playfair Display', Georgia, serif",
      georgia: "Georgia, serif",
      arial: "Arial, sans-serif",
      helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      times: "'Times New Roman', Times, serif",
      courier: "'Courier New', Courier, monospace",
    },
  };
  const defaultFonts = { chinese: 'system-sans', english: 'dm-sans' };
  let fontSettings;
  try {
    const storedFonts = JSON.parse(window.localStorage.getItem(fontSettingsKey) || 'null');
    fontSettings = {
      chinese: fontStacks.chinese[storedFonts?.chinese] ? storedFonts.chinese : defaultFonts.chinese,
      english: fontStacks.english[storedFonts?.english] ? storedFonts.english : defaultFonts.english,
    };
  } catch {
    fontSettings = { ...defaultFonts };
  }

  function applyFontSettings() {
    mapVisual.style.setProperty('--city-chinese-font', fontStacks.chinese[fontSettings.chinese]);
    mapVisual.style.setProperty('--city-english-font', fontStacks.english[fontSettings.english]);
    if (chineseFontInput) chineseFontInput.value = fontSettings.chinese;
    if (englishFontInput) englishFontInput.value = fontSettings.english;
  }

  function saveFontSettings() {
    window.localStorage.setItem(fontSettingsKey, JSON.stringify(fontSettings));
    applyFontSettings();
  }

  applyFontSettings();
  const defaults = {
    // These are published defaults. localStorage is only an optional visitor
    // override; it must never be the only place the production layout exists.
    x: Number(mapVisual.dataset.mapDefaultX) || 0,
    y: Number(mapVisual.dataset.mapDefaultY) || 0,
    scale: Number(mapVisual.dataset.mapDefaultScale) || 1,
    markers: Object.fromEntries(markedLocations.map((location) => [location.dataset.mapMarker, {
      x: Number(location.dataset.mapX),
      y: Number(location.dataset.mapY),
    }])),
  };
  let savedLayout;
  try {
    savedLayout = JSON.parse(window.localStorage.getItem(layoutKey) || 'null');
  } catch {
    savedLayout = null;
  }

  const cloneLayout = (layout) => ({
    x: Number(layout.x) || 0,
    y: Number(layout.y) || 0,
    scale: Number(layout.scale) || 1,
    markers: Object.fromEntries(markedLocations.map((location) => {
      const key = location.dataset.mapMarker;
      const fallback = defaults.markers[key];
      const marker = layout.markers?.[key] || fallback;
      const x = Number(marker.x);
      const y = Number(marker.y);
      return [key, {
        x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : fallback.x,
        y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : fallback.y,
      }];
    })),
  });
  let layout = cloneLayout(savedLayout || defaults);
  let view = { x: layout.x, y: layout.y, scale: layout.scale };

  function updateLabelPresentation(scale) {
    const labelScale = Math.min(1, 1 / Math.max(scale, 1));
    mapVisual.style.setProperty('--city-label-scale', labelScale);
    mapVisual.classList.toggle('labels-hidden', scale < 0.9);
  }

  function updateRoute() {
    const shenyang = layout.markers.shenyang;
    const dalian = layout.markers.dalian;
    if (!shenyang || !dalian) return;
    const midpoint = { x: (shenyang.x + dalian.x) / 2, y: (shenyang.y + dalian.y) / 2 };
    const path = mapVisual.querySelector('.route-line');
    if (path) path.setAttribute('d', `M${shenyang.x} ${shenyang.y} Q${midpoint.x + 1.4} ${midpoint.y - 1.2} ${dalian.x} ${dalian.y}`);
  }

  function applyView() {
    mapVisual.style.setProperty('--map-offset-x', `${view.x}px`);
    mapVisual.style.setProperty('--map-offset-y', `${view.y}px`);
    mapVisual.style.setProperty('--map-scale', view.scale);
    mapVisual.classList.add('has-local-layout');
    updateLabelPresentation(view.scale);
  }

  function applyLayout(syncView = true) {
    if (syncView) {
      view = { x: layout.x, y: layout.y, scale: layout.scale };
      applyView();
    }
    markedLocations.forEach((location) => {
      const marker = layout.markers[location.dataset.mapMarker];
      if (!marker) return;
      location.style.left = `${marker.x}%`;
      location.style.top = `${marker.y}%`;
    });
    if (scaleInput) scaleInput.value = layout.scale;
    if (scaleOutput) scaleOutput.textContent = `${Math.round(layout.scale * 100)}%`;
    updateRoute();
  }

  function saveLayout() {
    window.localStorage.setItem(layoutKey, JSON.stringify(layout));
    applyLayout();
  }

  function setEditorOpen(open) {
    if (!editor || !editorToggle) return;
    editor.hidden = !open;
    editorToggle.textContent = open ? 'close editor' : 'edit locally';
    editorToggle.setAttribute('aria-expanded', String(open));
    mapCard.classList.toggle('is-editing', open);
    if (open) {
      mapVisual.classList.remove('arrived');
      applyLayout();
    }
  }

  function resetLayout(removeSaved = false) {
    layout = cloneLayout(defaults);
    if (removeSaved) window.localStorage.removeItem(layoutKey);
    applyLayout();
  }

  if (editorMode && editorToggle) {
    editorToggle.hidden = false;
    editorToggle.setAttribute('aria-expanded', 'false');
    editorToggle.addEventListener('click', () => setEditorOpen(editor.hidden));
    scaleInput?.addEventListener('input', (event) => {
      layout.scale = Number(event.target.value);
      saveLayout();
    });
    resetButton?.addEventListener('click', () => resetLayout());
    clearButton?.addEventListener('click', () => resetLayout(true));
    chineseFontInput?.addEventListener('change', (event) => {
      fontSettings.chinese = event.target.value;
      saveFontSettings();
    });
    englishFontInput?.addEventListener('change', (event) => {
      fontSettings.english = event.target.value;
      saveFontSettings();
    });
  }

  mapVisual.classList.add('is-draggable');
  let drag;
  mapVisual.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.city, a')) return;
      drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y, editing: mapCard.classList.contains('is-editing') };
      mapVisual.setPointerCapture(event.pointerId);
      mapVisual.classList.add('is-dragging');
  });
  mapVisual.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    view.x = drag.x + event.clientX - drag.startX;
    view.y = drag.y + event.clientY - drag.startY;
    if (drag.editing) {
      layout.x = view.x;
      layout.y = view.y;
    }
    applyView();
  });
  const finishMapDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const wasEditing = drag.editing;
    drag = null;
    mapVisual.classList.remove('is-dragging');
    if (wasEditing) saveLayout();
  };
  mapVisual.addEventListener('pointerup', finishMapDrag);
  mapVisual.addEventListener('pointercancel', finishMapDrag);

  mapCard.addEventListener('wheel', (event) => {
    if (event.target.closest('.map-editor, .map-source')) return;
    event.preventDefault();
    const rect = mapVisual.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.65, Math.min(8, view.scale * factor));
    if (nextScale === view.scale) return;
    const pointerX = event.clientX - (rect.left + rect.width / 2);
    const pointerY = event.clientY - (rect.top + rect.height / 2);
    const scaleRatio = nextScale / view.scale;
    view.x -= pointerX * (scaleRatio - 1);
    view.y -= pointerY * (scaleRatio - 1);
    view.scale = nextScale;
    applyView();
  }, { passive: false });

  if (editorMode && editor) {
    markedLocations.forEach((location) => {
      location.addEventListener('pointerdown', (event) => {
        if (!mapCard.classList.contains('is-editing')) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = mapVisual.getBoundingClientRect();
        const marker = layout.markers[location.dataset.mapMarker];
        const dragMarker = { pointerId: event.pointerId, rect, location, marker: { ...marker } };
        location.setPointerCapture(event.pointerId);
        location.classList.add('is-dragging');
        const move = (moveEvent) => {
          if (moveEvent.pointerId !== dragMarker.pointerId) return;
          const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
          const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
          layout.markers[location.dataset.mapMarker] = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
          applyLayout();
        };
        const finish = () => {
          location.classList.remove('is-dragging');
          location.removeEventListener('pointermove', move);
          location.removeEventListener('pointerup', finish);
          location.removeEventListener('pointercancel', finish);
          saveLayout();
        };
        location.addEventListener('pointermove', move);
        location.addEventListener('pointerup', finish);
        location.addEventListener('pointercancel', finish);
      });
    });
    if (new URLSearchParams(window.location.search).has('edit-map')) setEditorOpen(true);
  }

  applyLayout(false);
  if (!mapCard.classList.contains('is-editing')) {
    const targetView = { x: layout.x, y: layout.y, scale: layout.scale };
    view = { x: 0, y: 0, scale: 1 };
    applyView();
    const mapImage = mapVisual.querySelector('.real-map');
    const imageReady = mapImage
      ? (mapImage.complete
        ? (typeof mapImage.decode === 'function' ? mapImage.decode().catch(() => undefined) : Promise.resolve())
        : new Promise((resolve) => {
          mapImage.addEventListener('load', resolve, { once: true });
          mapImage.addEventListener('error', resolve, { once: true });
        }))
      : Promise.resolve();
    const settleMap = () => {
      mapVisual.classList.remove('is-arriving');
      // Force one clean layout read after the animated transform is released.
      mapVisual.getBoundingClientRect();
    };
    mapVisual.addEventListener('transitionend', (event) => {
      if (event.target === mapVisual && event.propertyName === 'transform') settleMap();
    });
    imageReady.then(() => window.setTimeout(() => {
      mapVisual.classList.add('is-arriving');
      requestAnimationFrame(() => {
        view = targetView;
        applyView();
      });
      window.setTimeout(settleMap, 2100);
    }, 450));
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    let restoredLayout = null;
    try {
      restoredLayout = JSON.parse(window.localStorage.getItem(layoutKey) || 'null');
    } catch {
      restoredLayout = null;
    }
    layout = cloneLayout(restoredLayout || defaults);
    mapVisual.classList.remove('is-arriving');
    applyLayout();
  });
}

initializeMap();

// Blue FM is deliberately client-side: the first seed belongs to this browser,
// and each new play is a fresh, deterministic broadcast starting point.
const radio = {
  audio: document.querySelector('[data-radio-audio]'),
  toggle: document.querySelector('[data-radio-toggle]'),
  status: document.querySelector('[data-radio-status]'),
  track: document.querySelector('[data-radio-track]'),
  action: document.querySelector('[data-radio-action]'),
  note: document.querySelector('[data-radio-note]'),
  light: document.querySelector('.radio-light'),
  debug: document.querySelector('[data-radio-debug]'),
  debugNext: document.querySelector('[data-radio-debug-next]'),
  debugOutput: document.querySelector('[data-radio-debug-output]'),
  next: document.querySelector('[data-radio-next]'),
};

const radioTracks = [
  {
    title: 'Three O’clock in the Morning',
    artist: 'Paul Whiteman & His Orchestra · 1922',
    file: 'assets/radio/audio/three-oclock.ogg',
    weight: 1.15,
    startAt: 0.8,
  },
  {
    title: 'Dippermouth Blues',
    artist: 'King Oliver’s Creole Jazz Band · 1923',
    file: 'assets/radio/audio/dippermouth.flac',
    weight: 1.05,
    startAt: 1.2,
  },
  {
    title: 'Somebody Loves Me',
    artist: 'Paul Whiteman Orchestra · 1924',
    file: 'assets/radio/audio/somebody-loves-me.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Margie',
    artist: 'Original Dixieland Jazz Band · 1920',
    file: 'assets/radio/audio/margie.flac',
    weight: 0.95,
    startAt: 0.9,
  },
  {
    title: 'Keep on Going',
    artist: 'Daisy Martin with Tampa Bay Jazz Band · 1921',
    file: 'assets/radio/audio/keep-on-going.mp3',
    weight: 0.95,
    startAt: 0.8,
  },
  {
    title: 'Silver Swanee',
    artist: 'Guyon’s Paradise Orchestra · 1922',
    file: 'assets/radio/audio/silver-swanee.opus',
    weight: 0.9,
    startAt: 0.8,
  },
  {
    title: 'The Japanese Sandman',
    artist: 'Paul Whiteman and His Ambassador Orchestra · 1920',
    file: 'assets/radio/audio/japanese-sandman.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Afghanistan',
    artist: "Prince's Dance Orchestra · 1920",
    file: 'assets/radio/audio/afghanistan.opus',
    weight: 1.05,
    startAt: 0.8,
  },
  {
    title: 'Rose Room Fox Trot',
    artist: 'Art Hickman · 1917',
    file: 'assets/radio/audio/rose-room.ogg',
    weight: 0.8,
    startAt: 0.8,
    volume: 0.78,
  },
  {
    title: 'The Murray Walk',
    artist: "Prince's Band · 1916",
    file: 'assets/radio/audio/murray-walk.oga',
    weight: 0.75,
    startAt: 1.4,
  },
  {
    title: "There'll Be Some Changes Made",
    artist: 'Ethel Waters & The Jazz Masters · 1921',
    file: 'assets/radio/audio/there-ll-be-some-changes-made.opus',
    weight: 1.1,
    startAt: 0.8,
  },
  {
    title: 'Royal Garden Blues',
    artist: 'Mary Stafford and Her Jazz Band · 1921',
    file: 'assets/radio/audio/royal-garden-blues.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Blue Streak',
    artist: 'Roy Bargy · 1921',
    file: 'assets/radio/audio/blue-streak.opus',
    weight: 0.95,
    startAt: 0.8,
  },
  {
    title: 'April Showers',
    artist: 'Victor recording · 1922',
    file: 'assets/radio/audio/april-showers-1922.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Downhearted Blues',
    artist: 'Alberta Hunter · 1922',
    file: 'assets/radio/audio/downhearted-blues-alberta-hunter.ogg',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Lovable Eyes',
    artist: 'The Columbians · 1922',
    file: 'assets/radio/audio/lovable-eyes.mp3',
    weight: 0.95,
    startAt: 0.8,
  },
  {
    title: 'On the Alamo',
    artist: 'Benson Orchestra of Chicago · 1922',
    file: 'assets/radio/audio/on-the-alamo.mp3',
    weight: 0.95,
    startAt: 0.8,
  },
  {
    title: 'Panama',
    artist: 'New Orleans Rhythm Kings · 1922',
    file: 'assets/radio/audio/panama-new-orleans-rhythm-kings.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: "Runnin' Wild",
    artist: 'The Virginians · 1922',
    file: 'assets/radio/audio/runnin-wild-virginians.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Way Down Yonder in New Orleans',
    artist: 'The Georgians · 1922',
    file: 'assets/radio/audio/way-down-yonder-in-new-orleans.mp3',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'Malayan',
    artist: 'Banda Victor · 1920',
    file: 'assets/radio/audio/malayan-foxtrot.ogg',
    weight: 0.9,
    startAt: 0.8,
  },
  {
    title: 'Avalon',
    artist: "Art Hickman's Orchestra · 1920",
    file: 'assets/radio/audio/avalon-art-hickman.wav',
    weight: 0.8,
    startAt: 0.8,
  },
  {
    title: 'Crazy Blues',
    artist: 'Mamie Smith and Her Jazz Hounds · 1920',
    file: 'assets/radio/audio/crazy-blues-mamie-smith.ogg',
    weight: 1,
    startAt: 0.8,
  },
  {
    title: 'My Isle of Golden Dreams',
    artist: 'Victor recording · 1920',
    file: 'assets/radio/audio/my-isle-of-golden-dreams.mp3',
    weight: 0.9,
    startAt: 0.8,
  },
  {
    title: "Everybody's Jazzin' It",
    artist: 'Collins & Harlan · 1917',
    file: 'assets/radio/audio/everybodys-jazzin-it.ogg',
    weight: 0.8,
    startAt: 0.8,
  },
];

const radioAds = [
  {
    title: 'Advertising Record',
    artist: 'Len Spencer · c. 1906',
    file: 'assets/radio/audio/advertising-record.ogg',
    startAt: 0,
  },
];

if (radio.audio && radio.toggle) {
  const seedKey = 'blue-travels.radio.seed';
  const savedSeed = window.localStorage.getItem(seedKey);
  const seed = savedSeed || createRadioSeed();
  if (!savedSeed) window.localStorage.setItem(seedKey, seed);

  let broadcastStartedAt = 0;
  let trackIndex = -1;
  let sequenceStep = 0;
  let adIndex = -1;
  let adBreakIndex = 0;
  const adBreaks = [15 * 60, 32 * 60, 49 * 60];
  let adMode = false;
  let stationActive = false;
  const recentTrackWindow = 6;
  const recentTrackIndexes = [];
  const sessionPlayCounts = new Map();
  let audioContext;
  let audioSource;

  function setupRadioAudio() {
    if (audioContext) {
      return audioContext.state === 'suspended' ? audioContext.resume() : Promise.resolve();
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve();

    audioContext = new AudioContextClass();
    audioSource = audioContext.createMediaElementSource(radio.audio);

    // A stronger cleanup pass: remove more turntable rumble and shellac hiss
    // while leaving enough upper-mid detail for the recording to feel alive.
    const rumbleFilter = audioContext.createBiquadFilter();
    rumbleFilter.type = 'highpass';
    rumbleFilter.frequency.value = 125;
    rumbleFilter.Q.value = 0.7;

    const hissFilter = audioContext.createBiquadFilter();
    hissFilter.type = 'lowpass';
    hissFilter.frequency.value = 5600;
    hissFilter.Q.value = 0.7;

    const leveler = audioContext.createDynamicsCompressor();
    leveler.threshold.value = -28;
    leveler.knee.value = 18;
    leveler.ratio.value = 2.2;
    leveler.attack.value = 0.012;
    leveler.release.value = 0.2;

    audioSource.connect(rumbleFilter);
    rumbleFilter.connect(hissFilter);
    hissFilter.connect(leveler);
    leveler.connect(audioContext.destination);
    return audioContext.resume();
  }

  function createRadioSeed() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      window.crypto.getRandomValues(values);
      return `${values[0].toString(36)}-${values[1].toString(36)}`;
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function randomFor(value) {
    return hash(`${seed}:${value}`) / 4294967296;
  }

  function chooseTrack(timestamp, step) {
    let eligibleIndexes = radioTracks
      .map((_, index) => index)
      .filter((index) => radioTracks[index].available !== false && !recentTrackIndexes.includes(index));

    if (!eligibleIndexes.length) {
      eligibleIndexes = radioTracks
        .map((_, index) => index)
        .filter((index) => radioTracks[index].available !== false && index !== trackIndex);
    }
    if (!eligibleIndexes.length) return -1;

    const totalWeight = eligibleIndexes.reduce((total, index) => total + (radioTracks[index].weight || 1), 0);
    let pick = randomFor(`${timestamp}:${step}`) * totalWeight;
    let selectedIndex = eligibleIndexes[eligibleIndexes.length - 1];

    for (const index of eligibleIndexes) {
      pick -= radioTracks[index].weight || 1;
      if (pick <= 0) {
        selectedIndex = index;
        break;
      }
    }

    recentTrackIndexes.push(selectedIndex);
    if (recentTrackIndexes.length > recentTrackWindow) recentTrackIndexes.shift();
    return selectedIndex;
  }

  function updateTrackLabel(selectedTrack) {
    radio.track.textContent = `${selectedTrack.title} — ${selectedTrack.artist}`;
    updateDebug();
  }

  function recordSongPlay(index) {
    if (index < 0 || !radioTracks[index]) return;
    sessionPlayCounts.set(index, (sessionPlayCounts.get(index) || 0) + 1);
  }

  function setLiveState(isLive) {
    radio.status.textContent = isLive ? 'on air' : 'off air';
    radio.action.textContent = isLive ? 'turn off' : 'turn on';
    radio.toggle.setAttribute('aria-label', isLive ? 'Turn off Blue FM' : 'Turn on Blue FM');
    radio.toggle.setAttribute('aria-pressed', String(isLive));
    radio.light.classList.toggle('is-live', isLive);
    radio.toggle.closest('.radio-console')?.classList.toggle('is-live', isLive);
  }

  function setPausedState() {
    radio.status.textContent = 'paused';
    radio.action.textContent = 'resume';
    radio.toggle.setAttribute('aria-label', 'Resume Blue FM');
    radio.toggle.setAttribute('aria-pressed', 'false');
    radio.light.classList.remove('is-live');
    radio.toggle.closest('.radio-console')?.classList.remove('is-live');
  }

  function updateDebug() {
    if (!radio.debugOutput) return;
    const selectedTrack = radioTracks[trackIndex];
    if (!selectedTrack) {
      radio.debugOutput.textContent = 'Blue FM\noff air';
      return;
    }

    const state = radio.audio.paused ? 'paused' : 'playing';
    const playedSongs = [...sessionPlayCounts.entries()]
      .map(([index, count]) => `${count}×  ${radioTracks[index].title}`)
      .join('\n');
    radio.debugOutput.textContent = [
      'Blue FM',
      `${selectedTrack.title} — ${selectedTrack.artist}`,
      `state: ${state}`,
      `position: ${radio.audio.currentTime.toFixed(1)}s`,
      `lead-in trim: ${selectedTrack.startAt.toFixed(1)}s`,
      selectedTrack.file,
      '',
      'songs played this session:',
      playedSongs || '(none yet)',
    ].join('\n');
  }

  function beginBroadcast() {
    setupRadioAudio();
    stationActive = true;
    broadcastStartedAt = Date.now();
    sequenceStep = 0;
    adBreakIndex = 0;
    adMode = false;
    trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
    loadTrack();
  }

  function loadTrack() {
    const selectedTrack = radioTracks[trackIndex];
    if (!selectedTrack) {
      stationActive = false;
      setPausedState();
      radio.note.textContent = 'No playable recordings are available.';
      return;
    }
    updateTrackLabel(selectedTrack);
    radio.audio.volume = selectedTrack.volume ?? 1;
    radio.audio.src = new URL(selectedTrack.file, siteRoot).href;
    radio.audio.load();
    const seekPastLeadIn = () => {
      if (radio.audio.currentTime < selectedTrack.startAt) {
        radio.audio.currentTime = selectedTrack.startAt;
      }
      updateDebug();
    };
    if (radio.audio.readyState >= 1) seekPastLeadIn();
    else radio.audio.addEventListener('loadedmetadata', seekPastLeadIn, { once: true });
    // Call play synchronously from the click path. Waiting for the AudioContext
    // promise first can make mobile browsers treat this as a second, untrusted tap.
    setupRadioAudio();
    const playRequest = radio.audio.play();
    Promise.resolve(playRequest).then(() => {
      recordSongPlay(trackIndex);
      setLiveState(true);
      radio.note.textContent = 'The station has its own little weather.';
      updateDebug();
    }).catch((error) => {
      console.error('Blue FM could not start this recording.', error);
      radio.audio.pause();
      setPausedState();
      radio.note.textContent = 'Playback paused. Tap resume to continue.';
      updateDebug();
    });
  }

  function loadAd() {
    const selectedAd = radioAds[adIndex];
    updateTrackLabel(selectedAd);
    radio.audio.volume = selectedAd.volume ?? 1;
    radio.audio.src = new URL(selectedAd.file, siteRoot).href;
    radio.audio.load();
    radio.audio.play().catch((error) => {
      console.error('Blue FM ad could not start.', error);
      adMode = false;
      trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
      loadTrack();
    });
  }

  function maybeStartAd() {
    if (!radioAds.length || adMode || adBreakIndex >= adBreaks.length || !broadcastStartedAt) return;
    const elapsed = (Date.now() - broadcastStartedAt) / 1000;
    if (elapsed < adBreaks[adBreakIndex]) return;
    adBreakIndex += 1;
    adIndex = (adIndex + 1) % radioAds.length;
    adMode = true;
    loadAd();
  }

  function skipToNextSong() {
    if (!radio.audio.src) {
      beginBroadcast();
      return;
    }
    stationActive = true;
    adMode = false;
    radio.audio.pause();
    sequenceStep += 1;
    trackIndex = chooseTrack(broadcastStartedAt || Date.now(), sequenceStep);
    loadTrack();
  }

  function stopBroadcast() {
    stationActive = false;
    radio.audio.pause();
    radio.audio.removeAttribute('src');
    radio.audio.load();
    setLiveState(false);
    radio.note.textContent = 'Turn it on when you feel like company.';
    updateDebug();
  }

  radio.toggle.addEventListener('click', () => {
    if (radio.audio.paused && !radio.audio.src) beginBroadcast();
    else if (radio.audio.paused) {
      setupRadioAudio();
      const playRequest = radio.audio.play();
      Promise.resolve(playRequest).then(() => {
        stationActive = true;
        setLiveState(true);
        radio.note.textContent = 'The station has its own little weather.';
        updateDebug();
      }).catch((error) => {
        console.error('Blue FM could not resume this recording.', error);
        setPausedState();
        radio.note.textContent = 'Tap turn on to try Blue FM again.';
        updateDebug();
      });
    }
    else stopBroadcast();
  });

  radio.audio.addEventListener('ended', () => {
    if (adMode) {
      adMode = false;
      sequenceStep += 1;
      trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
      loadTrack();
      return;
    }
    sequenceStep += 1;
    trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
    loadTrack();
  });

  radio.audio.addEventListener('error', () => {
    const mediaError = radio.audio.error;
    console.error('Blue FM audio error.', mediaError);
    if (adMode) {
      // A missing optional ad should never take the station off air.
      adMode = false;
      sequenceStep += 1;
      trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
      loadTrack();
      return;
    }
    if (stationActive && trackIndex >= 0) {
      // Local recordings are static assets; skip a bad file and keep the
      // broadcast moving instead of leaving the player stranded.
      radioTracks[trackIndex].available = false;
      sequenceStep += 1;
      trackIndex = chooseTrack(broadcastStartedAt, sequenceStep);
      loadTrack();
      return;
    }
    setPausedState();
    radio.note.textContent = 'This recording could not be loaded. Tap resume to continue.';
    updateDebug();
  });

  radio.audio.addEventListener('playing', () => {
    if (stationActive) setLiveState(true);
  });

  radio.audio.addEventListener('timeupdate', () => {
    maybeStartAd();
    if (radio.debugOutput && !radio.debugOutput.hidden) updateDebug();
  });

  radio.debug?.addEventListener('click', () => {
    const isHidden = radio.debugOutput.hidden;
    radio.debugOutput.hidden = !isHidden;
    if (radio.debugNext) radio.debugNext.hidden = isHidden;
    radio.debug.setAttribute('aria-expanded', String(isHidden));
    updateDebug();
  });
  radio.debugNext?.addEventListener('click', skipToNextSong);
  radio.next?.addEventListener('click', skipToNextSong);
}

// Keep the radio element alive while moving between the site's HTML pages.
// A normal document navigation would destroy the audio element and stop playback.
async function navigateWithinSite(url, addHistoryEntry = true) {
  const response = await fetch(url.href);
  if (!response.ok) throw new Error(`Could not load ${url.href}`);

  const markup = await response.text();
  const isMarkdownPage = url.pathname.endsWith('.md');
  const nextDocument = isMarkdownPage ? null : new DOMParser().parseFromString(markup, 'text/html');
  const nextShell = isMarkdownPage ? createMarkdownShell(markup) : nextDocument.querySelector('.site-shell');
  const currentShell = document.querySelector('.site-shell');
  if (!nextShell || !currentShell) throw new Error('The destination has no site shell.');

  currentShell.replaceWith(nextShell);
  document.title = isMarkdownPage ? nextShell.querySelector('h1').textContent : nextDocument.title;
  if (addHistoryEntry) window.history.pushState({}, '', url.href);

  if (nextDocument) {
    nextDocument.body.querySelectorAll('script').forEach((script) => {
      if (script.src && script.src.endsWith('/app.js')) return;
      const replacement = document.createElement('script');
      for (const attribute of script.attributes) replacement.setAttribute(attribute.name, attribute.value);
      replacement.textContent = script.textContent;
      document.body.appendChild(replacement);
      replacement.remove();
    });
  }

  // Client-side navigation replaces the map DOM without reloading app.js.
  // Re-run map setup so restored markers, routes, and local view state apply
  // to the newly inserted page.
  initializeMap();

  window.scrollTo(0, 0);
}

function createMarkdownShell(markup) {
  const lines = markup.trim().split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# '));
  const title = titleLine ? titleLine.slice(2).trim() : 'Field note';
  const date = lines.find((line) => /^\d{4}-\d{2}-\d{2}$/.test(line.trim())) || '';
  const paragraphs = lines
    .slice(titleLine ? lines.indexOf(titleLine) + 1 : 0)
    .filter((line) => line.trim() && line.trim() !== date)
    .join('\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const shell = document.createElement('div');
  shell.className = 'site-shell note-page';
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = '<a class="wordmark" href="/"><span class="wordmark-mark">↗</span><span>blue travels</span></a><a class="text-link" href="/"><span>Back to map</span> ↑</a>';

  const main = document.createElement('main');
  main.className = 'note-content';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = date;
  const heading = document.createElement('h1');
  heading.textContent = title;
  main.append(eyebrow, heading);
  paragraphs.forEach((paragraph) => {
    const element = document.createElement('p');
    element.textContent = paragraph;
    main.append(element);
  });

  shell.append(header, main);
  return shell;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.target && link.target !== '_self') return;

  const url = new URL(link.href, window.location.href);
  const isSitePage = url.origin === window.location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('.md') || url.pathname.endsWith('/'));
  if (!isSitePage || url.hash) return;

  event.preventDefault();
  navigateWithinSite(url).catch(() => { window.location.assign(url.href); });
});

window.addEventListener('popstate', () => {
  navigateWithinSite(new URL(window.location.href), false).catch(() => { window.location.reload(); });
});
