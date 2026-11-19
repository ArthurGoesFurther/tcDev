import { EventEmitter } from 'node:events';

/** Longer gaps between ticks mean the machine slept; they never count as screen time. */
const MAX_STEP_SEC = 15;
/** An eye exercise this close to a walking break is dropped: the break rests the eyes too. */
const WALK_COVERS_EYES_SEC = 90;

/**
 * Counts active screen time and decides when reminders are due.
 * Events: eye-due, walk-due, walk-warning(secondsLeft), natural-break, paused, resumed.
 */
export class Scheduler extends EventEmitter {
  constructor({ settings, readIdle = async () => 0, idleReliable = true, now = Date.now }) {
    super();
    this.settings = settings;
    this.readIdle = readIdle;
    this.idleReliable = idleReliable;
    this.now = now;
    this.eyeSec = 0;
    this.walkSec = 0;
    this.busy = null;
    this.pausedUntil = 0;
    this.away = false;
    this.warned = false;
    this.last = now();
    this.ticking = false;
  }

  setSettings(settings) {
    this.settings = settings;
  }

  get paused() {
    return this.pausedUntil > this.now();
  }

  status() {
    const { eyes, walk } = this.settings;
    return {
      busy: this.busy,
      away: this.away,
      paused: this.paused,
      pausedUntil: this.paused ? this.pausedUntil : 0,
      eyeLeft: eyes.enabled ? Math.max(0, Math.ceil(eyes.intervalMin * 60 - this.eyeSec)) : null,
      walkLeft: walk.enabled ? Math.max(0, Math.ceil(walk.intervalMin * 60 - this.walkSec)) : null,
    };
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.step();
    } finally {
      this.ticking = false;
    }
  }

  async step() {
    const t = this.now();
    const dt = Math.max(0, (t - this.last) / 1000);
    this.last = t;

    if (this.pausedUntil) {
      if (this.pausedUntil > t) return;
      this.pausedUntil = 0;
      this.emit('resumed');
    }
    if (this.busy) return;

    const { eyes, walk, idle } = this.settings;
    const resetAfter = idle.resetAfterMin * 60;
    if (resetAfter > 0) {
      const idleSec = this.idleReliable ? await this.readIdle() : 0;
      if (this.busy || this.paused) return;
      if (Math.max(idleSec, dt > MAX_STEP_SEC ? dt : 0) >= resetAfter) {
        if (!this.away) {
          this.away = true;
          this.resetTimers();
          this.emit('natural-break');
        }
        return;
      }
    }
    this.away = false;

    const step = Math.min(dt, MAX_STEP_SEC);
    this.eyeSec += step;
    this.walkSec += step;

    const walkLeft = walk.intervalMin * 60 - this.walkSec;
    if (walk.enabled) {
      if (walkLeft <= 0) {
        this.busy = 'walk';
        this.emit('walk-due');
        return;
      }
      if (walk.warnSec > 0 && !this.warned && walkLeft <= walk.warnSec) {
        this.warned = true;
        this.emit('walk-warning', Math.ceil(walkLeft));
      }
    }
    if (eyes.enabled && this.eyeSec >= eyes.intervalMin * 60) {
      if (walk.enabled && walkLeft <= WALK_COVERS_EYES_SEC) {
        this.eyeSec = 0;
        return;
      }
      this.busy = 'eye';
      this.emit('eye-due');
    }
  }

  /** Marks a manually started reminder as running; false if another one is on screen. */
  begin(kind) {
    if (this.busy) return false;
    this.busy = kind;
    return true;
  }

  finishEye() {
    this.busy = null;
    this.eyeSec = 0;
  }

  /** result: done | skipped | snoozed */
  finishWalk(result) {
    const { walk } = this.settings;
    this.busy = null;
    if (result === 'snoozed') {
      const snooze = walk.snoozeMin * 60;
      this.walkSec = Math.max(0, walk.intervalMin * 60 - snooze);
      this.warned = snooze <= walk.warnSec;
      return;
    }
    this.walkSec = 0;
    this.warned = false;
    if (result === 'done') this.eyeSec = 0;
  }

  pause(minutes) {
    this.pausedUntil = minutes === Infinity ? Infinity : this.now() + minutes * 60_000;
    this.emit('paused');
  }

  resume() {
    if (!this.pausedUntil) return;
    this.pausedUntil = 0;
    this.last = this.now();
    this.emit('resumed');
  }

  resetTimers() {
    this.eyeSec = 0;
    this.walkSec = 0;
    this.warned = false;
  }
}
