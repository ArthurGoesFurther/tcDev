import { EXERCISE_IDS, exerciseById, poseAt } from '../shared/exercises.js';
import { formatClock, translate } from '../shared/i18n.js';
import { LIMITS, ORDERS, POSITIONS } from '../shared/settings.js';
import { FACE_H, FACE_W, drawFace } from '../shared/sprite.js';
import { createPixelCanvas, poseKey } from './pixels.js';

const api = window.razminka.settings;
let { settings, lang, info, status } = await api.load();

const t = (key, ...args) => translate(lang, key, ...args);
const $ = (selector) => document.querySelector(selector);
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...[].concat(children).filter((child) => child != null));
  return node;
};

const valueAt = (path) => path.split('.').reduce((obj, key) => obj?.[key], settings);
const patchFor = (path, value) => {
  const [group, key] = path.split('.');
  return key ? { [group]: { [key]: value } } : { [group]: value };
};

const save = async (path, value) => {
  settings = await api.update(patchFor(path, value));
  syncValues();
};

const SECTIONS = [
  {
    id: 'eyes',
    fields: [
      { path: 'eyes.enabled', type: 'toggle', label: 'set.enabled' },
      { path: 'eyes.intervalMin', type: 'number' },
      { path: 'eyes.durationSec', type: 'number' },
      {
        path: 'eyes.position',
        type: 'select',
        options: POSITIONS.map((value) => [value, `set.pos.${value}`]),
        note: () => (info.cursorMode === 'none' ? 'set.note.noCursor' : null),
      },
      {
        path: 'eyes.followCursor',
        type: 'toggle',
        disabled: () => !info.canFollow,
        note: () => (info.cursorMode === 'probe' ? 'set.note.waylandFollow' : null),
      },
      { path: 'eyes.faceScale', type: 'range' },
      { path: 'eyes.showHint', type: 'toggle' },
      {
        path: 'eyes.order',
        type: 'select',
        options: ORDERS.map((value) => [value, `set.order.${value}`]),
      },
      { path: 'eyes.sound', type: 'toggle' },
      { path: 'eyes.exercises', type: 'exercises' },
      { type: 'button', label: 'set.btn.eyeNow', command: 'eyeNow' },
    ],
  },
  {
    id: 'walk',
    fields: [
      { path: 'walk.enabled', type: 'toggle', label: 'set.enabled' },
      { path: 'walk.intervalMin', type: 'number' },
      { path: 'walk.durationMin', type: 'number' },
      { path: 'walk.snoozeMin', type: 'number' },
      { path: 'walk.warnSec', type: 'number' },
      {
        path: 'walk.requireIdle',
        type: 'toggle',
        disabled: () => !info.idleReliable,
        note: () => (info.idleReliable ? null : 'set.note.idleUnreliable'),
      },
      { path: 'walk.strict', type: 'toggle' },
      { path: 'walk.sound', type: 'toggle' },
      { type: 'button', label: 'set.btn.walkNow', command: 'walkNow' },
    ],
  },
  {
    id: 'general',
    fields: [
      {
        path: 'idle.resetAfterMin',
        type: 'number',
        disabled: () => !info.idleReliable,
      },
      {
        path: 'language',
        type: 'select',
        options: [
          ['auto', 'set.lang.auto'],
          ['ru', null, 'Русский'],
          ['en', null, 'English'],
        ],
      },
      { path: 'autostart', type: 'toggle' },
    ],
  },
];

const bind = (input, path) => {
  input.dataset.path = path;
  return input;
};

const controls = {
  toggle: (field) => {
    const input = el('input', { type: 'checkbox', className: 'switch' });
    input.addEventListener('change', () => save(field.path, input.checked));
    return bind(input, field.path);
  },
  number: (field) => {
    const input = el('input', { type: 'number', ...LIMITS[field.path] });
    input.addEventListener('change', () => save(field.path, input.value));
    return bind(input, field.path);
  },
  range: (field) => {
    const input = bind(el('input', { type: 'range', ...LIMITS[field.path] }), field.path);
    const output = el('output');
    const show = () => (output.textContent = `×${input.value}`);
    input.addEventListener('input', show);
    input.addEventListener('change', () => save(field.path, Number(input.value)));
    input.addEventListener('sync', show);
    return el('div', { className: 'range' }, [input, output]);
  },
  select: (field) => {
    const options = field.options.map(([value, key, text]) =>
      el('option', { value, textContent: key ? t(key) : text }),
    );
    const input = el('select', {}, options);
    input.addEventListener('change', () => save(field.path, input.value));
    return bind(input, field.path);
  },
};

let previewing = null;
let previewStart = 0;
const preview = (id) => {
  previewing = exerciseById(id);
  previewStart = performance.now();
  $('#caption').textContent = `${t(`ex.${id}.title`)}: ${t(`ex.${id}.hint`)}`;
  for (const link of document.querySelectorAll('.exercise .link')) {
    link.classList.toggle('active', link.dataset.exercise === id);
  }
};

const exerciseList = () =>
  el(
    'div',
    { className: 'exercises' },
    EXERCISE_IDS.map((id) => {
      const box = el('input', { type: 'checkbox' });
      box.dataset.exercise = id;
      box.addEventListener('change', () => {
        const next = EXERCISE_IDS.filter((x) =>
          x === id ? box.checked : settings.eyes.exercises.includes(x),
        );
        if (next.length) save('eyes.exercises', next);
        else box.checked = true;
      });
      const name = el('button', {
        type: 'button',
        className: 'link',
        textContent: t(`ex.${id}.title`),
        title: t(`ex.${id}.hint`),
      });
      name.dataset.exercise = id;
      name.addEventListener('click', () => preview(id));
      const play = el('button', {
        type: 'button',
        className: 'icon',
        textContent: '▶',
        title: t('set.btn.eyeNow'),
      });
      play.addEventListener('click', () => api.command('eyeNow', id));
      return el('div', { className: 'exercise' }, [box, name, play]);
    }),
  );

const row = (field) => {
  if (field.type === 'button') {
    const button = el('button', { type: 'button', textContent: t(field.label) });
    button.addEventListener('click', () => api.command(field.command));
    return el('div', { className: 'row actions' }, button);
  }
  if (field.type === 'exercises') {
    return el('div', { className: 'row block' }, [
      el('span', { className: 'label' }, [
        t('set.eyes.exercises'),
        el('small', { textContent: t('set.eyes.exercisesNote') }),
      ]),
      exerciseList(),
    ]);
  }
  const control = controls[field.type](field);
  const input = control.matches('[data-path]') ? control : control.querySelector('[data-path]');
  input.disabled = field.disabled?.() ?? false;
  const note = field.note?.();
  return el('label', { className: 'row' }, [
    el('span', { className: 'label' }, [
      t(field.label ?? `set.${field.path}`),
      note ? el('small', { textContent: t(note) }) : null,
    ]),
    control,
  ]);
};

const syncValues = () => {
  for (const input of document.querySelectorAll('[data-path]')) {
    if (input === document.activeElement && input.type === 'number') continue;
    const value = valueAt(input.dataset.path);
    if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
    input.dispatchEvent(new Event('sync'));
  }
  for (const box of document.querySelectorAll('input[data-exercise]')) {
    box.checked = settings.eyes.exercises.includes(box.dataset.exercise);
  }
};

const renderStatus = () => {
  const s = status;
  if (s.paused) {
    $('#status').textContent = Number.isFinite(s.pausedUntil)
      ? t(
          'tray.pausedUntil',
          new Date(s.pausedUntil).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
        )
      : t('tray.paused');
  } else {
    const part = (left, kind) =>
      left === null
        ? t('set.statusOff')
        : s.busy === kind
          ? t('set.statusBusy')
          : formatClock(left);
    $('#status').textContent =
      `${t('set.statusEyes', part(s.eyeLeft, 'eye'))} · ${t('set.statusWalk', part(s.walkLeft, 'walk'))}`;
  }
  $('#stats').textContent = t('set.stats', s.today.eyes, s.today.walks, s.today.skipped);
  $('#pause-btn').textContent = t(s.paused ? 'set.btn.resume' : 'set.btn.pause');
};

const render = () => {
  document.title = t('set.title');
  document.documentElement.lang = lang;
  $('#app-name').textContent = t('appName');
  $('#reset-btn').textContent = t('set.btn.reset');
  $('#caption').textContent = '';
  previewing = null;
  $('#form').replaceChildren(
    ...SECTIONS.map((section) =>
      el('section', {}, [
        el('h2', { textContent: t(`set.section.${section.id}`) }),
        ...section.fields.map(row),
      ]),
    ),
  );
  const wayland = info.wayland ? ' (Wayland)' : '';
  $('#footer').textContent =
    `v${info.version} · ${info.platform}${wayland} · cursor: ${info.cursorMode} · idle: ${info.idleSource}`;
  syncValues();
  renderStatus();
};

$('#pause-btn').addEventListener('click', () =>
  status.paused ? api.command('resume') : api.command('pause', 30),
);
$('#reset-btn').addEventListener('click', () => api.command('reset'));

api.onStatus((next) => {
  status = next;
  renderStatus();
});
api.onChanged((next) => {
  settings = next.settings;
  if (next.lang !== lang) {
    lang = next.lang;
    render();
  } else {
    syncValues();
  }
});

const pixels = createPixelCanvas($('#preview'), FACE_W, FACE_H, 3);
const idlePose = (sec) => ({
  lookX: Math.sin(sec * 0.7) * 0.8,
  lookY: Math.sin(sec * 0.45) * 0.4,
  lids: sec % 3.7 < 0.15 ? 'closed' : 'open',
});
let drawn = '';
const animate = (now) => {
  const duration = settings.eyes.durationSec;
  const elapsed = (now - previewStart) / 1000;
  if (previewing && elapsed > duration) {
    previewing = null;
    $('#caption').textContent = '';
    for (const link of document.querySelectorAll('.exercise .link'))
      link.classList.remove('active');
  }
  const pose = previewing ? poseAt(previewing, elapsed, duration) : idlePose(now / 1000);
  const key = poseKey(pose);
  if (key !== drawn) {
    drawn = key;
    pixels.clear();
    drawFace(pixels.put, pose);
  }
  requestAnimationFrame(animate);
};

render();
requestAnimationFrame(animate);
