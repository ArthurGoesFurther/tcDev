# TakeCareDev

**English** · [Русский](README.ru.md) · [中文](README.zh-CN.md)

A little pixel face that reminds you to exercise your eyes and get up from the chair. Lives in the
tray, works on Windows, macOS and Linux.

![icon](build/icon.png)

**Download:** [latest release](https://github.com/ArthurGoesFurther/tcDev/releases/latest)

| System                       | File                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Windows                      | `TakeCareDev-0.1.0-win-portable.exe`                                             |
| macOS (Apple Silicon, M1–M4) | `TakeCareDev-0.1.0-mac-arm64.zip`                                                |
| Linux                        | `TakeCareDev-0.1.0-linux-amd64.deb` or `TakeCareDev-0.1.0-linux-x86_64.AppImage` |

## Features

- **Eye exercises.** Every N minutes (20 by default, the 20-20-20 rule) a pixel face pops up next
  to your cursor and shows an exercise for N seconds (10 by default): left–right, up–down,
  circles, diagonals, figure eight, blinking, squeezing, looking far away, near–far focus, resting
  with closed eyes. You just follow its pupils. The window is transparent, click-through and never
  steals focus, so it doesn't interrupt typing.
- **Stand up and walk.** Every N minutes (50 by default) a break of N minutes (5 by default): a card
  with a timer, a tip (squats, stairs, stretching, water), "Snooze" and "Skip".
- **Strict mode.** The break covers every monitor and hides the buttons. Emergency exit is in the
  tray menu.
- **Honest timer.** By default the break timer only runs while you don't touch the mouse and
  keyboard — sitting in front of the break screen doesn't count.
- **Natural breaks.** If you were away longer than N minutes (or the laptop slept), countdowns start
  over instead of nagging you right after you sit down.
- A notification N seconds before a break.
- Pause for 30 min / 1 h / 2 h / until resumed, daily stats, launch at login.
- Choose which exercises to show, their order, face size, a screen corner instead of the cursor,
  hint bubble and sound.
- English and Russian UI.

Every interval and duration is configurable: tray → "Settings…", or launch the app again.

### First launch

- **Windows:** the build is unsigned, SmartScreen will warn — "More info" → "Run anyway".
- **macOS:** ad-hoc signed, not notarized. Unzip, move `TakeCareDev.app` to Applications, then run
  `xattr -cr /Applications/TakeCareDev.app` (or right-click → "Open").
- **Linux:** `.deb` is preferred — it installs an AppArmor profile, without which Electron on
  Ubuntu 24.04+ only runs with `--no-sandbox` (the AppImage adds that flag itself).
  `sudo apt install ./TakeCareDev-0.1.0-linux-amd64.deb`. The AppImage needs `chmod +x` and, on
  Ubuntu 24.04, `sudo apt install libfuse2t64`.

## Why this exists

Programmers sit for 8–12 hours a day staring at a screen half a meter away. Two things quietly
break from that: eyes and the lower body.

### Failing eyesight

- **Myopia is an epidemic.** About 30% of the world was nearsighted in 2020; the projection for 2050
  is ~50%, nearly 5 billion people. Long near work and little time looking at distance are among
  the main risk factors.
- **Accommodation spasm.** To focus at 50 cm the ciliary muscle stays contracted for hours. After a
  long day distance looks blurry, the eyes ache, and the head hurts — "computer vision syndrome".
- **Dry eye.** While reading a screen we blink about 3–4 times less often than normal (roughly
  15–20 times a minute drops to around 5). The tear film evaporates: burning, redness, sand in the
  eyes.
- **What helps:** the 20-20-20 rule recommended by ophthalmologists — every 20 minutes look at
  something ~6 m (20 ft) away for 20 seconds — plus deliberate blinking and changing focus. That's
  exactly what the face does.

To be clear: eye exercises won't reverse existing myopia. They relieve strain and dryness and keep
the habit of looking away, which is the part that's in your control.

### Hemorrhoids and sitting

- **Pressure.** Sitting puts constant pressure on the veins of the anal canal, and blood return
  from the pelvis slows down. The veins stretch and the cushions slide down — that's hemorrhoidal
  disease.
- **Motionless gut.** Little movement means slower bowel motility, constipation and straining —
  the main trigger of hemorrhoids. The same goes for long sitting on the toilet with a phone.
- **It's common.** Studies estimate hemorrhoidal disease in anywhere from ~4% to ~40% of adults
  depending on the method; most people just don't talk about it until it hurts.
- **What helps:** getting up every 45–60 minutes and walking for a few minutes. Walking restores
  venous return and gets the gut moving. Squats and stairs from the break tips work even better.

Long sitting is also tied to back and neck pain, worse circulation in the legs and higher
cardiovascular risk, so the walking break pays off several times over.

TakeCareDev doesn't replace a doctor. If something already hurts or your vision has dropped — see
an ophthalmologist / proctologist.

## Project structure

```
src/
  main/            Electron main process
    main.js        entry: wiring, tray menu, IPC, Wayland → XWayland relaunch
    scheduler.js   pure timer logic (no Electron), covered by tests
    face.js        transparent click-through window with the face near the cursor
    break.js       break screen(s), strict mode on all monitors
    cursor.js      cursor tracking per platform / session type
    idle.js        idle time (powerMonitor, or Mutter over D-Bus on GNOME Wayland)
    store.js       settings and daily stats in JSON
    tray.js        tray icon and menu
    autostart.js   launch at login (.desktop on Linux, login items elsewhere)
    icons.js       tray and app icons rendered from the sprite (raster.js → PNG)
    settings-window.js, json-file.js
  preload/
    preload.cjs    exposes window.tcdev (face, breakScreen, settings) to renderers
  renderer/        windows: face, break, settings (plain HTML/CSS/JS, no framework)
  shared/
    sprite.js      the face sprite, drawn in code — no image assets
    exercises.js   exercises: what the face does at each second
    i18n.js        translations (ru, en)
    settings.js    settings schema and defaults
build/             app icons
scripts/
  make-icons.js    renders build/icon.png from the sprite
  adhoc-sign.js    ad-hoc signs macOS builds made outside macOS (rcodesign)
test/              node:test tests for the scheduler
```

### Build

```bash
npm install
npm run dist:linux   # dist/*.AppImage, dist/*.deb
npm run dist:win     # dist/*.exe (installer and portable)
npm run dist:mac     # dist/*.dmg, dist/*.zip (arm64 and x64)
```

Other platforms from Linux:

```bash
npx electron-builder --win portable           # portable .exe; the NSIS installer needs wine
npx electron-builder --mac zip --x64 --arm64  # DMG only builds on macOS
```

macOS builds outside macOS need [rcodesign](https://github.com/indygreg/apple-platform-rs/releases)
on `PATH` (or `RCODESIGN=/path`): without an ad-hoc signature Apple Silicon refuses to launch the
app.

### Development

```bash
npm start                              # electron . --no-sandbox
npm test                               # timer and settings logic
npm run icons                          # regenerate build/icon.png from the sprite
TCDEV_DATA_DIR=/tmp/tc npm start       # separate settings profile
```

### Linux and Wayland

- Wayland doesn't let apps see the cursor or place windows by coordinates, so in a Wayland session
  the app relaunches itself under XWayland (`--ozone-platform=x11`). XWayland only learns the
  cursor position when it's over one of its windows, so a transparent window flashes on each
  monitor for a split second before the face appears. On Wayland the face appears next to the
  cursor but can't follow it.
- On GNOME idle time comes from Mutter (`org.gnome.Mutter.IdleMonitor` over D-Bus): Electron's
  `powerMonitor` always returns 0 under Wayland. On other Wayland compositors idle-based features
  are disabled.
- The tray icon on GNOME needs the AppIndicator extension (enabled by default on Ubuntu). Without
  it, open settings by launching the app again.

## Sources

- Holden B.A. et al., _Global Prevalence of Myopia and High Myopia and Temporal Trends from 2000
  through 2050_, Ophthalmology, 2016.
- American Academy of Ophthalmology, _Computers, Digital Devices and Eye Strain_ (20-20-20 rule).
- Patel S. et al., _Effect of visual display unit use on blink rate and tear stability_, Optometry
  and Vision Science, 1991.
- Johanson J.F., Sonnenberg A., _The prevalence of hemorrhoids and chronic constipation_,
  Gastroenterology, 1990.
- Riss S. et al., _The prevalence of hemorrhoids in adults_, International Journal of Colorectal
  Disease, 2012.
- Lohsiriwat V., _Hemorrhoids: from basic pathophysiology to clinical management_, World Journal of
  Gastroenterology, 2012.
