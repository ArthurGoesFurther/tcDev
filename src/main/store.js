import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { mergeSettings, normalizeSettings } from '../shared/settings.js';
import { readJson, writeJson } from './json-file.js';

export const createSettingsStore = (file) => {
  const events = new EventEmitter();
  const existed = fs.existsSync(file);
  let current = normalizeSettings(readJson(file) ?? {});
  writeJson(file, current);

  return {
    existed,
    get: () => current,
    update(patch) {
      const prev = current;
      current = mergeSettings(current, patch);
      writeJson(file, current);
      events.emit('change', current, prev);
      return current;
    },
    onChange: (listener) => events.on('change', listener),
  };
};

const today = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const createStats = (file) => {
  const fresh = () => ({ day: today(), eyes: 0, walks: 0, skipped: 0, snoozed: 0 });
  let data = readJson(file);
  const current = () => {
    if (data?.day !== today()) data = fresh();
    return data;
  };

  return {
    today: () => ({ ...current() }),
    bump(key) {
      current()[key] += 1;
      writeJson(file, data);
    },
  };
};
