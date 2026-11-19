import { formatClock, translate } from '../shared/i18n.js';
import { FACE_W, WALKER_H, drawFace, drawWalker } from '../shared/sprite.js';
import { createPixelCanvas } from './pixels.js';
import { chirp } from './sound.js';

const SCALE = 6;
/** Clicks right after the window pops up are most likely meant for something else. */
const ARM_DELAY_MS = 1200;

const $ = (selector) => document.querySelector(selector);
const shownAt = performance.now();
const pixels = createPixelCanvas($('#walker'), FACE_W, WALKER_H, SCALE);
let state = null;

const t = (key, ...args) => translate(state.lang, key, ...args);

const render = () => {
  const done = state.phase === 'done';
  const tips = t('break.tips');
  document.body.classList.toggle('strict', state.strict);
  document.body.classList.toggle('done', done);
  $('#title').textContent = t(done ? 'break.doneTitle' : 'break.title');
  $('#tip').textContent = done ? t('break.doneText') : tips[state.tip % tips.length];
  $('#timer').textContent = formatClock(state.remaining);
  $('.bar').style.transform = `scaleX(${state.remaining / state.total})`;
  const statusKey = !state.requireIdle
    ? 'break.status.plain'
    : state.waiting
      ? 'break.status.waiting'
      : 'break.status.running';
  $('#status').textContent = done ? '' : t(statusKey);
  $('#status').classList.toggle('waiting', !done && state.waiting);
  $('#snooze').textContent = t('break.snooze', t('time.min', state.snoozeMin));
  $('#skip').textContent = t('break.skip');
  $('#close').textContent = t('break.close');
  $('#snooze').hidden = done || state.strict;
  $('#skip').hidden = done || state.strict;
  $('#close').hidden = !done;
  $('#note').textContent = state.strict && !done ? t('break.strictNote') : '';
};

window.razminka.breakScreen.onState((next) => {
  const first = !state;
  const finished = state?.phase === 'running' && next.phase === 'done';
  state = next;
  render();
  if (state.sound && (first || finished)) chirp(finished ? [523, 659, 784, 1047] : [784, 523]);
});

for (const id of ['snooze', 'skip', 'close']) {
  $(`#${id}`).addEventListener('click', () => {
    if (performance.now() - shownAt > ARM_DELAY_MS) window.razminka.breakScreen.action(id);
  });
}

let drawn = '';
const animate = (now) => {
  const sec = now / 1000;
  const mode = !state ? 'wait' : state.phase === 'done' ? 'done' : state.waiting ? 'wait' : 'walk';
  const look = Math.round(Math.sin(sec * 1.3) * 1.2);
  const step = Math.floor(sec / 0.32) % 2;
  const key = mode === 'walk' ? `walk|${step}|${look}` : mode;
  if (key !== drawn) {
    drawn = key;
    pixels.clear();
    if (mode === 'walk') drawWalker(pixels.put, sec, { lookX: look / 2 });
    else if (mode === 'done') drawFace(pixels.put, { lids: 'relaxed', mouth: 'open' }, 0, 2);
    else drawFace(pixels.put, { lookY: -0.5, mouth: 'o', brows: 'raised' }, 0, 2);
  }
  requestAnimationFrame(animate);
};
requestAnimationFrame(animate);
