import { EXERCISE_IDS } from './exercises.js';

export const POSITIONS = [
  'cursor',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
];
export const ORDERS = ['random', 'sequential'];
export const LANGUAGE_SETTINGS = ['auto', 'ru', 'en'];

export const DEFAULTS = {
  language: 'auto',
  autostart: false,
  eyes: {
    enabled: true,
    intervalMin: 20,
    durationSec: 10,
    exercises: [...EXERCISE_IDS],
    order: 'random',
    position: 'cursor',
    followCursor: true,
    faceScale: 4,
    showHint: true,
    sound: false,
  },
  walk: {
    enabled: true,
    intervalMin: 50,
    durationMin: 5,
    snoozeMin: 5,
    warnSec: 30,
    requireIdle: true,
    strict: false,
    sound: true,
  },
  idle: {
    resetAfterMin: 5,
  },
};

/** Numeric limits shared by validation and the settings form. */
export const LIMITS = {
  'eyes.intervalMin': { min: 1, max: 240, step: 0.5 },
  'eyes.durationSec': { min: 3, max: 120, step: 1 },
  'eyes.faceScale': { min: 2, max: 8, step: 1 },
  'walk.intervalMin': { min: 1, max: 480, step: 0.5 },
  'walk.durationMin': { min: 0.5, max: 60, step: 0.5 },
  'walk.snoozeMin': { min: 1, max: 120, step: 1 },
  'walk.warnSec': { min: 0, max: 600, step: 5 },
  'idle.resetAfterMin': { min: 0, max: 240, step: 0.5 },
};

const num = (value, fallback, path) => {
  const { min, max, step } = LIMITS[path];
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  if (value === null || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n / step) * step));
};
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const oneOf = (value, list, fallback) => (list.includes(value) ? value : fallback);

export const normalizeSettings = (raw = {}) => {
  const e = raw.eyes ?? {};
  const w = raw.walk ?? {};
  const i = raw.idle ?? {};
  const D = DEFAULTS;
  const picked = Array.isArray(e.exercises)
    ? EXERCISE_IDS.filter((id) => e.exercises.includes(id))
    : D.eyes.exercises;

  return {
    language: oneOf(raw.language, LANGUAGE_SETTINGS, D.language),
    autostart: bool(raw.autostart, D.autostart),
    eyes: {
      enabled: bool(e.enabled, D.eyes.enabled),
      intervalMin: num(e.intervalMin, D.eyes.intervalMin, 'eyes.intervalMin'),
      durationSec: num(e.durationSec, D.eyes.durationSec, 'eyes.durationSec'),
      exercises: picked.length ? picked : [...EXERCISE_IDS],
      order: oneOf(e.order, ORDERS, D.eyes.order),
      position: oneOf(e.position, POSITIONS, D.eyes.position),
      followCursor: bool(e.followCursor, D.eyes.followCursor),
      faceScale: num(e.faceScale, D.eyes.faceScale, 'eyes.faceScale'),
      showHint: bool(e.showHint, D.eyes.showHint),
      sound: bool(e.sound, D.eyes.sound),
    },
    walk: {
      enabled: bool(w.enabled, D.walk.enabled),
      intervalMin: num(w.intervalMin, D.walk.intervalMin, 'walk.intervalMin'),
      durationMin: num(w.durationMin, D.walk.durationMin, 'walk.durationMin'),
      snoozeMin: num(w.snoozeMin, D.walk.snoozeMin, 'walk.snoozeMin'),
      warnSec: num(w.warnSec, D.walk.warnSec, 'walk.warnSec'),
      requireIdle: bool(w.requireIdle, D.walk.requireIdle),
      strict: bool(w.strict, D.walk.strict),
      sound: bool(w.sound, D.walk.sound),
    },
    idle: {
      resetAfterMin: num(i.resetAfterMin, D.idle.resetAfterMin, 'idle.resetAfterMin'),
    },
  };
};

/** Applies a partial update like `{ eyes: { intervalMin: 25 } }`. */
export const mergeSettings = (current, patch = {}) =>
  normalizeSettings({
    ...current,
    ...patch,
    eyes: { ...current.eyes, ...patch.eyes },
    walk: { ...current.walk, ...patch.walk },
    idle: { ...current.idle, ...patch.idle },
  });
