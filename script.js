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

async function init() {
  const manifest = await fetch('sequences.json').then(r => r.json());
  const shuffled = shuffle(manifest.sequences);

  sequences = await Promise.all(
    shuffled.map(async (seq) => ({
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

  document.body.addEventListener('click', advance);
  advance();
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function advance() {
  stepIndex++;
  let seq = sequences[seqIndex];
  let enteringNewSequence = stepIndex === 0;

  if (!seq) return renderEnd();

  if (stepIndex >= seq.steps.length) {
    seqIndex++;
    stepIndex = 0;
    seq = sequences[seqIndex];
    enteringNewSequence = true;
    if (!seq) return renderEnd();
  }

  renderStep(seq, seq.steps[stepIndex], enteringNewSequence);
}

function renderStep(seq, step, enteringNewSequence) {
  if (step.background) {
    document.body.style.backgroundColor = step.background;
  }

  if (step.mode === 'replace' || enteringNewSequence) {
    stage.innerHTML = '';
    textLayer.innerHTML = '';
  }

  (step.images || []).forEach((img) => addImage(seq.id, img));

  if (step.text) addText(step.text);
}

// img.slot picks a fixed position/size defined once in style.css (e.g. "slot-survey").
// Without a slot, img.top/img.left/img.width position it freely (used for the
// progressively-layered Parkchester photos) — see README for the copy-paste template.
// img.src is always just a filename inside that sequence's photos/<sequence-id>/ folder.
function addImage(seqId, img) {
  const el = document.createElement('img');
  el.src = `photos/${seqId}/${img.src}`;
  el.alt = img.alt || '';
  el.dataset.src = img.src;

  if (img.slot) {
    el.className = `layered-image slot-${img.slot}`;
  } else {
    el.className = 'layered-image free';
    el.style.top = img.top || '10%';
    el.style.left = img.left || '10%';
    if (img.width) el.style.width = img.width;
    if (img.zIndex) el.style.zIndex = img.zIndex;
    if (img.blend) el.style.mixBlendMode = img.blend;
    if (arrangeMode) {
      el.draggable = false; // disable native image drag so our own drag handler receives the events
      makeDraggable(el);
    }
  }

  el.onerror = () => el.classList.add('missing');
  stage.appendChild(el);
}

// Arrange-mode only: drag a freeform image around the stage with the mouse,
// tracking its position in percent so it stays correct at any window size.
function makeDraggable(el) {
  el.addEventListener('click', (e) => e.stopPropagation());

  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const stageRect = stage.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startTop = el.offsetTop;
    const startLeft = el.offsetLeft;

    function onMove(moveEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      el.style.left = `${((startLeft + deltaX) / stageRect.width) * 100}%`;
      el.style.top = `${((startTop + deltaY) / stageRect.height) * 100}%`;
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
// freeform image so it can be copy-pasted into the sequence's JSON.
function showLayoutOverlay() {
  const layout = Array.from(stage.querySelectorAll('.layered-image.free')).map((el) => ({
    src: el.dataset.src,
    top: el.style.top,
    left: el.style.left,
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
  stage.innerHTML = '';
  textLayer.innerHTML = '<div class="step-text end">End.</div>';
  hint.style.display = 'none';
  document.body.removeEventListener('click', advance);
}

init();
