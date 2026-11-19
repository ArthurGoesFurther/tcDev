# TakeCareDev

[English](README.md) · [Русский](README.ru.md) · **中文**

一个像素小脸，提醒你做眼保健操、起身走动。常驻系统托盘，支持 Windows、macOS 和 Linux。

![icon](build/icon.png)

**下载：** [最新版本](https://github.com/ArthurGoesFurther/tcDev/releases/latest)

| 系统                          | 文件                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| Windows                       | `TakeCareDev-0.1.0-win-portable.exe`                                             |
| macOS（Apple Silicon，M1–M4） | `TakeCareDev-0.1.0-mac-arm64.zip`                                                |
| Linux                         | `TakeCareDev-0.1.0-linux-amd64.deb` 或 `TakeCareDev-0.1.0-linux-x86_64.AppImage` |

## 功能

- **眼保健操。** 每隔 N 分钟（默认 20 分钟，即 20-20-20 法则），一张像素小脸会出现在鼠标旁边，
  用 N 秒（默认 10 秒）演示一个动作：左右看、上下看、转圈、对角线、画"8"字、眨眼、紧闭双眼、
  远眺、远近交替、闭眼休息。你只要跟着它的瞳孔转动就行。窗口透明、点击穿透、不抢焦点，不会打断你打字。
- **起身走走。** 每隔 N 分钟（默认 50 分钟）休息 N 分钟（默认 5 分钟）：一张带计时器和小提示
  （深蹲、爬楼梯、拉伸、喝水）的卡片，可以"稍后提醒"或"跳过"。
- **严格模式。** 休息画面覆盖所有显示器并隐藏按钮。紧急退出在托盘菜单里。
- **诚实计时。** 默认情况下，只有在你不碰鼠标和键盘时休息计时才会走——坐在休息画面前干等不算数。
- **自然休息。** 如果你离开超过 N 分钟（或笔记本休眠了），倒计时会重新开始，不会你一坐下就催你。
- 休息前 N 秒发送通知。
- 暂停 30 分钟 / 1 小时 / 2 小时 / 直到手动恢复，每日统计，开机自启。
- 可以选择要做的动作、顺序、小脸大小、显示在屏幕角落而不是鼠标旁、提示气泡和声音。
- 界面语言：英语和俄语。

所有间隔和时长都可以调整：托盘 →"设置…"，或者再次启动应用。

### 首次启动

- **Windows：** 安装包未签名，SmartScreen 会弹出警告——点"更多信息"→"仍要运行"。
- **macOS：** 仅 ad-hoc 签名，未经公证。解压后把 `TakeCareDev.app` 拖进"应用程序"，然后执行
  `xattr -cr /Applications/TakeCareDev.app`（或右键 →"打开"）。
- **Linux：** 推荐 `.deb`——它会安装 AppArmor 配置，否则 Ubuntu 24.04+ 上的 Electron 只能带
  `--no-sandbox` 运行（AppImage 会自动加上这个参数）。
  `sudo apt install ./TakeCareDev-0.1.0-linux-amd64.deb`。AppImage 需要 `chmod +x`，在
  Ubuntu 24.04 上还需要 `sudo apt install libfuse2t64`。

## 为什么要做这个

程序员每天坐 8–12 个小时，盯着半米外的屏幕。有两样东西在悄悄被损耗：眼睛，以及腰部以下。

### 视力下降

- **近视已成流行病。** 2020 年全球约 30% 的人近视；预计到 2050 年将达到约 50%，接近 50 亿人。
  长时间近距离用眼、很少远眺，是最主要的风险因素之一。
- **调节痉挛。** 为了对焦 50 厘米处，睫状肌要连续紧绷好几个小时。漫长的一天过后，看远处发虚、
  眼睛酸痛、头痛——这就是"视频终端综合征"。
- **干眼。** 盯着屏幕时，我们眨眼的次数比平时少 3–4 倍（每分钟约 15–20 次降到约 5 次）。
  泪膜蒸发，导致灼烧感、发红、眼里像进了沙子。
- **有效的做法：** 眼科医生推荐的 20-20-20 法则——每 20 分钟看向约 6 米（20 英尺）外的物体
  20 秒——再加上有意识地眨眼和切换焦距。小脸做的正是这些。

实话实说：眼保健操无法逆转已有的近视。它能缓解疲劳和干涩，并帮你养成移开视线的习惯——这是你能掌控的部分。

### 痔疮与久坐

- **压力。** 坐着时，肛管静脉持续受压，盆腔血液回流变慢。静脉被撑开，肛垫下移——这就是痔病。
- **肠道不动。** 活动少，肠蠕动就慢，导致便秘和用力排便——这是痔疮最主要的诱因。
  蹲厕所时长时间刷手机也一样。
- **非常普遍。** 根据研究方法不同，成年人中痔病的患病率约在 4% 到 40% 之间；只是大多数人不到疼的时候都不愿提起。
- **有效的做法：** 每 45–60 分钟起身走几分钟。走路能恢复静脉回流、促进肠道蠕动。
  休息提示里的深蹲和爬楼梯效果更好。

久坐还与腰背和颈部疼痛、下肢血液循环变差以及心血管风险升高有关，所以起身走走的回报远不止一处。

TakeCareDev 不能替代医生。如果已经疼了或视力已经下降——请去看眼科 / 肛肠科医生。

## 项目结构

```
src/
  main/            Electron 主进程
    main.js        入口：模块组装、托盘菜单、IPC、Wayland → XWayland 重启
    scheduler.js   纯计时逻辑（不依赖 Electron），有测试覆盖
    face.js        鼠标旁显示小脸的透明、点击穿透窗口
    break.js       休息画面，严格模式下覆盖所有显示器
    cursor.js      按平台 / 会话类型追踪鼠标
    idle.js        空闲时间（powerMonitor，GNOME Wayland 下通过 D-Bus 读取 Mutter）
    store.js       设置和每日统计，存为 JSON
    tray.js        托盘图标和菜单
    autostart.js   开机自启（Linux 用 .desktop，其他平台用登录项）
    icons.js       由精灵图生成托盘和应用图标（raster.js → PNG）
    settings-window.js, json-file.js
  preload/
    preload.cjs    向渲染进程暴露 window.tcdev（face、breakScreen、settings）
  renderer/        窗口：小脸、休息、设置（纯 HTML/CSS/JS，无框架）
  shared/
    sprite.js      小脸精灵图，用代码绘制——没有图片资源
    exercises.js   动作定义：小脸每一秒在做什么
    i18n.js        翻译（ru、en）
    settings.js    设置结构与默认值
build/             应用图标
scripts/
  make-icons.js    用精灵图生成 build/icon.png
  adhoc-sign.js    为非 macOS 上构建的 macOS 包做 ad-hoc 签名（rcodesign）
test/              基于 node:test 的调度器测试
```

### 构建

```bash
npm install
npm run dist:linux   # dist/*.AppImage, dist/*.deb
npm run dist:win     # dist/*.exe（安装版和便携版）
npm run dist:mac     # dist/*.dmg, dist/*.zip（arm64 和 x64）
```

在 Linux 上构建其他平台：

```bash
npx electron-builder --win portable           # 便携版 .exe；NSIS 安装包需要 wine
npx electron-builder --mac zip --x64 --arm64  # DMG 只能在 macOS 上构建
```

在非 macOS 系统上构建 macOS 包需要把 [rcodesign](https://github.com/indygreg/apple-platform-rs/releases)
放进 `PATH`（或设置 `RCODESIGN=/路径`）：没有 ad-hoc 签名，Apple Silicon 会拒绝启动应用。

### 开发

```bash
npm start                              # electron . --no-sandbox
npm test                               # 计时与设置逻辑
npm run icons                          # 用精灵图重新生成 build/icon.png
TCDEV_DATA_DIR=/tmp/tc npm start       # 使用独立的设置目录
```

### Linux 与 Wayland

- Wayland 不允许应用读取鼠标位置或按坐标放置窗口，因此在 Wayland 会话中应用会通过 XWayland
  重新启动（`--ozone-platform=x11`）。XWayland 只有在鼠标位于它的窗口上方时才知道鼠标位置，
  所以显示小脸之前会在每个显示器上短暂闪现一个透明窗口。在 Wayland 下小脸只能出现在鼠标旁边，无法跟随。
- GNOME 上的空闲时间来自 Mutter（通过 D-Bus 调用 `org.gnome.Mutter.IdleMonitor`）：Wayland
  下 Electron 的 `powerMonitor` 总是返回 0。在其他 Wayland 合成器上，依赖空闲时间的功能会被关闭。
- GNOME 上的托盘图标需要 AppIndicator 扩展（Ubuntu 默认启用）。没有它的话，再次启动应用即可打开设置。

## 参考资料

- Holden B.A. et al., _Global Prevalence of Myopia and High Myopia and Temporal Trends from 2000
  through 2050_, Ophthalmology, 2016.
- American Academy of Ophthalmology, _Computers, Digital Devices and Eye Strain_（20-20-20 法则）。
- Patel S. et al., _Effect of visual display unit use on blink rate and tear stability_, Optometry
  and Vision Science, 1991.
- Johanson J.F., Sonnenberg A., _The prevalence of hemorrhoids and chronic constipation_,
  Gastroenterology, 1990.
- Riss S. et al., _The prevalence of hemorrhoids in adults_, International Journal of Colorectal
  Disease, 2012.
- Lohsiriwat V., _Hemorrhoids: from basic pathophysiology to clinical management_, World Journal of
  Gastroenterology, 2012.
