// Draw tick marks on the analog clock face
(function drawTicks() {
  const ticks = document.getElementById('ticks');
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 100);
    line.setAttribute('y1', big ? 14 : 16);
    line.setAttribute('x2', 100);
    line.setAttribute('y2', big ? 24 : 20);
    line.setAttribute('stroke', big ? '#cbd5e1' : '#475569');
    line.setAttribute('stroke-width', big ? 2 : 1);
    line.setAttribute('transform', 'rotate(' + (i * 6) + ' 100 100)');
    ticks.appendChild(line);
  }
})();

// State
let elapsed = 0;       // total ms shown
let baseMs  = 0;       // ms banked before last resume
let startTs = 0;       // Date.now() at last resume
let running = false;
let timerId = null;
const laps = [];       // array of elapsed ms at each lap

// DOM refs
const display    = document.getElementById('display');
const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const startBtn   = document.getElementById('start-btn');
const lapBtn     = document.getElementById('lap-btn');
const resetBtn   = document.getElementById('reset-btn');
const lapsList   = document.getElementById('laps-list');
const lapsEmpty  = document.getElementById('laps-empty');
const lapsTitle  = document.getElementById('laps-title');
const minuteHand = document.getElementById('minute-hand');
const secondHand = document.getElementById('second-hand');

// Helpers
function pad(n, w) { w = w || 2; return String(n).padStart(w, '0'); }

function format(ms) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const hr  = Math.floor(totalSec / 3600);
  return hr > 0
    ? pad(hr) + ':' + pad(min) + ':' + pad(sec) + '.' + pad(cs)
    : pad(min) + ':' + pad(sec) + '.' + pad(cs);
}

function render() {
  display.textContent = format(elapsed);

  // Rotate analog hands
  const totalSec = elapsed / 1000;
  const secAngle = (totalSec % 60) * 6;
  const minAngle = ((totalSec / 60) % 60) * 6;
  secondHand.setAttribute('transform', 'rotate(' + secAngle + ' 100 100)');
  minuteHand.setAttribute('transform', 'rotate(' + minAngle + ' 100 100)');

  // Status pill
  statusPill.classList.remove('running', 'paused');
  if (running) {
    statusPill.classList.add('running');
    statusText.textContent = 'Running';
  } else if (elapsed > 0) {
    statusPill.classList.add('paused');
    statusText.textContent = 'Paused';
  } else {
    statusText.textContent = 'Ready';
  }

  // Button states
  startBtn.textContent = running ? 'Pause' : (elapsed === 0 ? 'Start' : 'Resume');
  startBtn.classList.toggle('running', running);
  lapBtn.disabled   = !running && elapsed === 0;
  resetBtn.disabled = elapsed === 0 && laps.length === 0;
}

function tick() {
  elapsed = baseMs + (Date.now() - startTs);
  render();
}

// Actions
function startPause() {
  if (running) {
    // Pause: bank time so far
    baseMs = baseMs + (Date.now() - startTs);
    clearInterval(timerId);
    timerId = null;
    running = false;
  } else {
    startTs = Date.now();
    timerId = setInterval(tick, 10);
    running = true;
  }
  render();
}

function reset() {
  clearInterval(timerId);
  timerId = null;
  running = false;
  elapsed = 0;
  baseMs  = 0;
  laps.length = 0;
  renderLaps();
  render();
}

function lap() {
  if (!running && elapsed === 0) return;
  laps.unshift(elapsed);
  renderLaps();
}

function renderLaps() {
  if (laps.length === 0) {
    lapsList.hidden = true;
    lapsEmpty.hidden = false;
    lapsTitle.textContent = 'Laps';
    return;
  }
  lapsEmpty.hidden = true;
  lapsList.hidden  = false;
  lapsTitle.textContent = 'Laps (' + laps.length + ')';

  // Compute splits and find best/worst
  const splits = laps.map((t, i) => t - (laps[i + 1] || 0));
  let bestIdx = -1, worstIdx = -1;
  if (splits.length > 1) {
    let best = Infinity, worst = -Infinity;
    splits.forEach((s, i) => {
      if (s < best)  { best = s;  bestIdx = i; }
      if (s > worst) { worst = s; worstIdx = i; }
    });
  }

  lapsList.innerHTML = '';
  laps.forEach((total, i) => {
    const li = document.createElement('li');
    const splitCls =
      i === bestIdx  ? 'lap-split best'  :
      i === worstIdx ? 'lap-split worst' : 'lap-split';
    li.innerHTML =
      '<span class="lap-name">Lap ' + (laps.length - i) + '</span>' +
      '<span class="' + splitCls + '">' + format(splits[i]) + '</span>' +
      '<span class="lap-total">' + format(total) + '</span>';
    lapsList.appendChild(li);
  });
}

// Event listeners
startBtn.addEventListener('click', startPause);
lapBtn.addEventListener('click', lap);
resetBtn.addEventListener('click', reset);

document.addEventListener('keydown', function (e) {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); startPause(); }
  else if (e.key.toLowerCase() === 'l') { lap(); }
  else if (e.key.toLowerCase() === 'r') { reset(); }
});

render();
