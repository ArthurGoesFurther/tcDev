import { exerciseById, poseAt } from '../shared/exercises.js';
import { translate } from '../shared/i18n.js';
import { FACE_H, FACE_W, drawFace } from '../shared/sprite.js';
import { createPixelCanvas, poseKey } from './pixels.js';
import { chirp } from './sound.js';

const OUTRO_MS = 240;
const $ = (selector) => document.querySelector(selector);

const finish = () => {
  document.body.classList.replace('show', 'hide');
  setTimeout(() => window.razminka.face.done(), OUTRO_MS);
};

window.razminka.face.onStart(({ exercise, durationSec, scale, showHint, sound, side, lang }) => {
  const ex = exerciseById(exercise);
  const classes = document.body.classList;
  classes.toggle('flip', side === 'left');
  classes.toggle('no-hint', !showHint);
  $('#title').textContent = translate(lang, `ex.${ex.id}.title`);
  $('#hint').textContent = translate(lang, `ex.${ex.id}.hint`);

  const canvas = $('#face');
  const pixels = createPixelCanvas(canvas, FACE_W, FACE_H, scale);
  const bars = document.querySelectorAll('.bar');
  if (sound) chirp([660, 990]);

  let drawn = '';
  let started = null;
  const frame = (now) => {
    started ??= now;
    const t = (now - started) / 1000;
    const left = Math.max(0, durationSec - t);
    const pose = poseAt(ex, t, durationSec);
    const bob = Math.floor(t / 0.5) % 2;
    const key = `${poseKey(pose)}|${bob}`;
    if (key !== drawn) {
      drawn = key;
      pixels.clear();
      drawFace(pixels.put, pose);
      canvas.style.transform = `translateY(${-bob * scale}px)`;
    }
    for (const bar of bars) bar.style.transform = `scaleX(${left / durationSec})`;
    $('#secs').textContent = translate(lang, 'time.sec', Math.ceil(left));
    if (left > 0) requestAnimationFrame(frame);
    else finish();
  };
  requestAnimationFrame((now) => {
    classes.add('show');
    frame(now);
  });
});
