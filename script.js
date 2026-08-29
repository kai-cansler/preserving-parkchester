const stage = document.getElementById('stage');
const textLayer = document.getElementById('text-layer');
const hint = document.getElementById('hint');
const copyLayoutBtn = document.getElementById('copy-layout-btn');
const layoutOverlay = document.getElementById('layout-overlay');
const layoutOutput = document.getElementById('layout-output');
const layoutClose = document.getElementById('layout-close');

// Open the page with ?arrange=1 to drag freeform layers into place and
// export their positions. Never enabled for regular visitors.
const arrangeMode = new URLSearchParams(location.search).has('arrange');

let sequences = [];
let seqIndex = 0;
let stepIndex = -1;

// Every freeform image currently on screen: { el, spec }, in the order added.
// Anchors always end up earlier in this list than whatever anchors to them,
// since an image can only reference an anchor from an earlier step.
let activeImages = [];
// spec.id -> { el, spec }, for images other entries can anchor to (e.g. "calendar").
let anchorRegistry = {};

async function init() {
  const manifest = await fetch('sequences.json').then(r => r.json());

  sequences = await Promise.all(
    manifest.sequences.map(async (seq) => ({
      ...seq,
      steps: await fetch(seq.jsonPath).then(r => r.json()),
    }))
  );

  document.querySelectorAll('.site-nav a').forEach((link) => {
    link.addEventListener('click', (e) => e.stopPropagation());
  });

  if (arrangeMode) {
    document.body.classList.add('arrange-mode');
    copyLayoutBtn.hidden = false;
    copyLayoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLayoutOverlay();
    });
    layoutClose.addEventListener('click', (e) => {
      e.stopPropagation();
      layoutOverlay.hidden = true;
    });
    layoutOverlay.addEventListener('click', (e) => e.stopPropagation());
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => activeImages.forEach(positionImage), 100);
  });

  document.body.addEventListener('click', advance);
  advance();
}

// True once the last sequence (Manhattan) finishes and the "how many
// sculptures" screen is showing. The next click restarts from the top
// instead of advancing a step, inviting a second look-through.
let atEnd = false;

function advance() {
  if (atEnd) {
    atEnd = false;
    seqIndex = 0;
    stepIndex = -1;
  }

  stepIndex++;
  let seq = sequences[seqIndex];
  let enteringNewSequence = stepIndex === 0;

  if (!seq) {
    atEnd = true;
    return renderEnd();
  }

  if (stepIndex >= seq.steps.length) {
    seqIndex++;
    stepIndex = 0;
    seq = sequences[seqIndex];
    enteringNewSequence = true;
    if (!seq) {
      atEnd = true;
      return renderEnd();
    }
  }

  renderStep(seq, seq.steps[stepIndex], enteringNewSequence);
}

function renderStep(seq, step, enteringNewSequence) {
  if (step.background) {
    document.body.style.backgroundColor = step.background;
  }

  if (step.mode === 'replace' || enteringNewSequence) {
    clearStage();
  }

  (step.images || []).forEach((img) => addImage(seq.id, img));

  if (step.text) addText(step.text);
}

function clearStage() {
  stage.innerHTML = '';
  textLayer.innerHTML = '';
  activeImages = [];
  anchorRegistry = {};
}

// img.slot picks a fixed position/size defined once in style.css (e.g. "slot-survey").
// Without a slot, img.top/img.left/img.width position it freely (used for the
// progressively-layered Parkchester photos) — see README for the copy-paste template.
// img.src is a filename inside photos/<img.folder or the sequence's own id>/ —
// use img.folder to pull from a shared folder (e.g. "icons") instead of the
// sequence's own photo folder.
//
// img.id names this image so a later image can lock onto it with img.anchor —
// see "anchorLeft"/"anchorTop" below. Every freeform image, anchored or not, is
// kept fully on screen: its position is clamped against its own actual
// rendered size once the photo has loaded, and re-clamped on window resize.
function addImage(seqId, img) {
  const el = document.createElement('img');
  el.src = `photos/${img.folder || seqId}/${img.src}`;
  el.alt = img.alt || '';
  el.dataset.src = img.src;

  if (img.slot) {
    el.className = `layered-image slot-${img.slot}`;
    el.onerror = () => el.classList.add('missing');
    stage.appendChild(el);
    return;
  }

  el.className = 'layered-image free';
  el.style.visibility = 'hidden'; // positioned once its real size is known, see below
  if (img.width) el.style.width = img.width;
  if (img.zIndex) el.style.zIndex = img.zIndex;
  if (img.blend) el.style.mixBlendMode = img.blend;

  if (arrangeMode && !img.anchor) {
    el.draggable = false; // disable native image drag so our own drag handler receives the events
    makeDraggable(el);
  }

  const record = { el, spec: img };
  activeImages.push(record);
  if (img.id) anchorRegistry[img.id] = record;

  const place = () => {
    el.style.visibility = 'visible';
    positionImage(record);
  };
  el.onload = place;
  el.onerror = () => {
    el.classList.add('missing');
    place();
  };

  stage.appendChild(el);
}

// Resolves spec.top/left (percent of stage) or spec.anchor (a fixed pixel
// offset from another image's actual on-screen position), then nudges the
// result so the image's real rendered box never crosses a stage edge.
//
// Anchored images are the exception: they always simply follow their anchor's
// actual (already-clamped) position plus a fixed offset, with no clamping of
// their own. Clamping an anchored image independently would let it drift away
// from its anchor at extreme viewport sizes — exactly the drift this whole
// anchor system exists to prevent.
function positionImage(record) {
  const { el, spec } = record;
  const stageRect = stage.getBoundingClientRect();

  if (spec.anchor) {
    const anchor = anchorRegistry[spec.anchor];
    if (!anchor) return;
    const anchorRect = anchor.el.getBoundingClientRect();
    el.style.left = `${(anchorRect.left - stageRect.left) + (spec.anchorLeft || 0)}px`;
    el.style.top = `${(anchorRect.top - stageRect.top) + (spec.anchorTop || 0)}px`;
    return;
  }

  const maxLeft = Math.max(0, stageRect.width - el.offsetWidth);
  const maxTop = Math.max(0, stageRect.height - el.offsetHeight);

  // "center" is resolved from the image's actual rendered size, so it stays
  // truly centered at any viewport width — a fixed percentage can only line
  // up at the one viewport width it was measured against, since width is a
  // fixed pixel value rather than also being a percentage.
  const left = spec.left === 'center' ? maxLeft / 2 : percentToPx(spec.left, stageRect.width, 10);
  const top = spec.top === 'center' ? maxTop / 2 : percentToPx(spec.top, stageRect.height, 10);
  el.style.left = `${clamp(left, 0, maxLeft)}px`;
  el.style.top = `${clamp(top, 0, maxTop)}px`;
}

function percentToPx(value, basis, fallbackPercent) {
  const percent = typeof value === 'string' && value.endsWith('%') ? parseFloat(value) : fallbackPercent;
  return (percent / 100) * basis;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Arrange-mode only: drag a freeform image around the stage with the mouse.
// Anchored images (e.g. the X locked to the calendar) aren't draggable — move
// the anchor and they follow automatically.
function makeDraggable(el) {
  el.addEventListener('click', (e) => e.stopPropagation());

  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = el.offsetLeft;
    const startTop = el.offsetTop;

    function onMove(moveEvent) {
      el.style.left = `${startLeft + moveEvent.clientX - startX}px`;
      el.style.top = `${startTop + moveEvent.clientY - startY}px`;
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// Arrange-mode only: reads back the current on-screen position of every
// draggable (non-anchored) freeform image so it can be copy-pasted into the
// sequence's JSON, converted back to percent so it stays a starting point
// rather than a viewport-specific pixel value.
function showLayoutOverlay() {
  const stageRect = stage.getBoundingClientRect();
  const layout = activeImages
    .filter(({ spec }) => !spec.anchor)
    .map(({ el, spec }) => ({
      src: spec.src,
      top: `${((el.offsetTop / stageRect.height) * 100).toFixed(4)}%`,
      left: `${((el.offsetLeft / stageRect.width) * 100).toFixed(4)}%`,
    }));
  layoutOutput.value = JSON.stringify(layout, null, 2);
  layoutOverlay.hidden = false;
  layoutOutput.focus();
  layoutOutput.select();
}

function addText(text) {
  const el = document.createElement('div');
  el.className = 'step-text';
  el.textContent = text.content;
  el.style.top = text.top || '80%';
  el.style.left = text.left || '10%';
  textLayer.appendChild(el);
}

function renderEnd() {
  clearStage();
  textLayer.innerHTML = '<div class="step-text end">How many sculptures did you spot?</div>';
}

init();
