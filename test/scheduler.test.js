import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scheduler } from '../src/main/scheduler.js';
import { mergeSettings, normalizeSettings } from '../src/shared/settings.js';

const setup = (patch = {}, { idle = () => 0, idleReliable = true } = {}) => {
  let clock = 1_000_000;
  const settings = mergeSettings(normalizeSettings(), patch);
  const scheduler = new Scheduler({
    settings,
    readIdle: async () => idle(),
    idleReliable,
    now: () => clock,
  });
  const events = [];
  for (const name of ['eye-due', 'walk-due', 'walk-warning', 'natural-break', 'resumed']) {
    scheduler.on(name, (arg) => events.push({ name, at: (clock - 1_000_000) / 1000, arg }));
  }
  const run = async (seconds) => {
    for (let i = 0; i < seconds; i++) {
      clock += 1000;
      await scheduler.tick();
    }
  };
  const jump = async (seconds) => {
    clock += seconds * 1000;
    await scheduler.tick();
  };
  return { scheduler, events, run, jump, names: () => events.map((e) => e.name) };
};

test('eye exercise is due after the interval and the timer restarts when it ends', async () => {
  const { scheduler, events, run } = setup({ eyes: { intervalMin: 1 }, walk: { enabled: false } });
  await run(59);
  assert.equal(events.length, 0);
  await run(1);
  assert.deepEqual(
    events.map((e) => [e.name, e.at]),
    [['eye-due', 60]],
  );
  await run(30);
  assert.equal(events.length, 1, 'nothing piles up while the face is on screen');
  scheduler.finishEye();
  await run(60);
  assert.deepEqual(
    events.map((e) => [e.name, e.at]),
    [
      ['eye-due', 60],
      ['eye-due', 150],
    ],
  );
});

test('walking break warns in advance and then becomes due', async () => {
  const { events, run } = setup({
    eyes: { enabled: false },
    walk: { intervalMin: 2, warnSec: 30 },
  });
  await run(120);
  assert.deepEqual(
    events.map((e) => [e.name, e.at, e.arg]),
    [
      ['walk-warning', 90, 30],
      ['walk-due', 120, undefined],
    ],
  );
});

test('snooze brings the break back after the snooze time', async () => {
  const { scheduler, names, events, run } = setup({
    eyes: { enabled: false },
    walk: { intervalMin: 10, snoozeMin: 1, warnSec: 0 },
  });
  await run(600);
  assert.deepEqual(names(), ['walk-due']);
  scheduler.finishWalk('snoozed');
  await run(60);
  assert.deepEqual(
    events.map((e) => [e.name, e.at]),
    [
      ['walk-due', 600],
      ['walk-due', 660],
    ],
  );
});

test('a finished break also resets the eye timer, a skipped one does not', async () => {
  const { scheduler, run } = setup({ eyes: { intervalMin: 20 }, walk: { intervalMin: 5 } });
  await run(300);
  assert.equal(scheduler.busy, 'walk');
  scheduler.finishWalk('done');
  assert.equal(scheduler.eyeSec, 0);
  await run(300);
  scheduler.finishWalk('skipped');
  assert.equal(scheduler.walkSec, 0);
  assert.equal(scheduler.eyeSec, 300);
});

test('eye exercise is dropped when the walking break is about to start', async () => {
  const { names, run } = setup({
    eyes: { intervalMin: 10 },
    walk: { intervalMin: 11, warnSec: 0 },
  });
  await run(660);
  assert.deepEqual(names(), ['walk-due']);
});

test('being away long enough resets both timers once', async () => {
  let idle = 0;
  const { scheduler, names, run } = setup(
    { eyes: { intervalMin: 20 }, walk: { intervalMin: 50 }, idle: { resetAfterMin: 5 } },
    { idle: () => idle },
  );
  await run(600);
  idle = 300;
  await run(5);
  assert.deepEqual(names(), ['natural-break']);
  assert.equal(scheduler.eyeSec, 0);
  assert.equal(scheduler.walkSec, 0);
  await run(100);
  assert.equal(scheduler.walkSec, 0, 'time away does not count');
  idle = 0;
  await run(10);
  assert.equal(scheduler.walkSec, 10);
  assert.deepEqual(names(), ['natural-break']);
});

test('sleep or suspend counts as being away', async () => {
  const { scheduler, names, run, jump } = setup({ idle: { resetAfterMin: 5 } });
  await run(600);
  await jump(3600);
  assert.deepEqual(names(), ['natural-break']);
  assert.equal(scheduler.walkSec, 0);
});

test('without idle reset a long sleep still adds only a few seconds', async () => {
  const { scheduler, run, jump } = setup({ idle: { resetAfterMin: 0 } });
  await run(100);
  await jump(3600);
  assert.equal(scheduler.walkSec, 115);
});

test('unreliable idle source never triggers natural breaks', async () => {
  const { names, run } = setup(
    { eyes: { intervalMin: 20 }, idle: { resetAfterMin: 1 } },
    { idle: () => 10_000, idleReliable: false },
  );
  await run(120);
  assert.deepEqual(names(), []);
});

test('pause freezes the timers and resumes on its own', async () => {
  const { scheduler, names, run } = setup({ eyes: { intervalMin: 1 }, walk: { enabled: false } });
  await run(30);
  scheduler.pause(10);
  await run(599);
  assert.equal(scheduler.eyeSec, 30);
  assert.deepEqual(names(), []);
  await run(1);
  assert.deepEqual(names(), ['resumed']);
  await run(29);
  assert.deepEqual(names(), ['resumed', 'eye-due']);
});

test('manual reminders cannot overlap', () => {
  const { scheduler } = setup();
  assert.equal(scheduler.begin('eye'), true);
  assert.equal(scheduler.begin('walk'), false);
  scheduler.finishEye();
  assert.equal(scheduler.begin('walk'), true);
});

test('settings are clamped and unknown values fall back to defaults', () => {
  const s = normalizeSettings({
    language: 'de',
    eyes: { intervalMin: '0', durationSec: 9999, exercises: ['blink', 'nope'], position: 'moon' },
    walk: { durationMin: '2,5', warnSec: -5 },
  });
  assert.equal(s.language, 'auto');
  assert.equal(s.eyes.intervalMin, 1);
  assert.equal(s.eyes.durationSec, 120);
  assert.deepEqual(s.eyes.exercises, ['blink']);
  assert.equal(s.eyes.position, 'cursor');
  assert.equal(s.walk.durationMin, 2.5);
  assert.equal(s.walk.warnSec, 0);
  assert.equal(normalizeSettings({ eyes: { exercises: [] } }).eyes.exercises.length, 10);
});
