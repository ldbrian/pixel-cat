# BUILD PLAN：《小方糕》可玩性优化 v1（B 相熟度 + A 光点）

## Goal

让「一次性的摸头」变成「一只记得你、愿意陪你玩的小猫」：
- **B 相熟度与记忆**：猫记得你来了几次、摸了多久、上次是否被惹恼——带来主动靠近与「先躲再和好」。
- **A 光点追逐**：偶尔出现一个会移动的小光点，猫眼跟随，拖到它面前它会扑——扑中或扑空。

不改治愈系调性。只动 `index.html` 一个文件。

---

## Simplest Solution

全部改在 `index.html` 现有 IIFE 内，不新增文件、不加构建：

- **记忆**：一个 `memory` 对象 + 两个读写函数，存 localStorage 一个 key。
- **熟悉度**：由 `visits` 推出三个等级（0/1/2），改 `gazeLean()` 一处。
- **躲闪**：一个 `shyUntil` 时间戳，期间 `gazeLean()` 取反。
- **光点**：一个 `dot` 对象 + 四态（hidden / drift / grabbed / pounce），沿用现有 `SPRITES` + `drawSprite` + `charms` + Web Audio。
- **扑**：一个 `pounce` 小状态机（idle → alert → pounce → recover），复用 `pose.ear/lean/squint`。

没有任何新依赖。所有新增状态都是「几个变量 + 几个 if」。

---

## Tech Decision

| 选择 | 理由 |
| --- | --- |
| 只改 index.html | 改动面最小、双击可验收；不动 parts.js / studio-track.js / 埋点 |
| localStorage 一个 key（`catmem_pixelcat`） | 三个数字的记忆，不需要新模块 |
| 复用 `gazeLean()` / `fx` / `SPRITES` / `charms` / `mrrpSound` | IDEA 原则：优先复用现有机制 |
| 光点用现有 `drawSprite` 画 | 不需要新渲染管线 |
| 新增调试钩子 `window.CATDBG` | 强制等级/躲闪/扑，方便逐项验收，不影响正常逻辑 |

---

## Core States

猫（已有）：`idle → petting → annoyed → angry → asleep`

新增，叠加在猫状态之上：

```
shy        —— leftAnnoyed 回来后的前 7s：头别开、耳微压、不回应
proactive  —— level 2 + 本会话摸够阈值：安静瞬间主动朝指针蹭一下
```

光点独立状态机：

```
hidden ──调度──▶ drift ──pointerdown 靠近──▶ grabbed ──进入头部区──▶ alert(250ms) ──▶ pounce ──▶ recover
                                                       └──拖出头部区──▶ drift
```

---

## Architecture（index.html 内部新增，按序）

```
1. memory 读写（visits / petSec / leftAnnoyed / lastVisitAt）
2. 加载初始化：visits++，算 level，读 leftAnnoyed → 设 shy
3. 卸载写入：累计 petSec；annoy>0.5 时置 leftAnnoyed
4. gazeLean() 改造：shy 反向 / level≥1 更主动 / 有光点时追光点
5. petSec 累计：holding && !angry && !asleep 时累加，每 5s 刷一次 + 卸载时刷
6. proactive：level 2 且会话 petSec > 20s，安静瞬间触发蹭（冷却 60s）
7. dot 状态机 + 调度（20–40s 出现、停留 15–25s、asleep/angry 不出现）
8. pounce 状态机（idle → alert → pounce → recover）+ 音效 + fx
9. render() 里画 dot（drawSprite 带脉冲），扑时叠加 dust fx
```

---

## 关键参数（Builder 直接照抄）

```
MEMORY_KEY   = 'catmem_pixelcat'
SHY_MS       = 7000          // 躲闪时长
LEVEL_2_MIN  = 3             // visits>=3 进入 level 2（第三四次主动）
PET_FLUSH_MS = 5000          // 抚摸时长刷盘周期
PROACTIVE_MIN_PET = 20       // 会话累计抚摸秒数阈值
PROACTIVE_CD = 60000         // 主动蹭冷却
DOT_GAP      = rand(20000, 40000)
DOT_LIFE     = rand(15000, 25000)
DOT_GRAB_R   = 6             // 抓取半径（格）
DOT_ZONE     = { x:[26,54], y:[4,32] }   // 触发扑的头部区域（比 HEAD 略收紧）
POUNCE_ALERT = 250           // 竖耳预警
POUNCE_MS    = 350           // 扑动作
CATCH_R      = 8             // 扑中判定半径（格，以头部中心 40,18 算）
POUNCE_CD    = 30000         // 扑冷却
```

level 判定：`visits === 1 → 0；visits === 2 → 1；visits >= 3 → 2`。

`gazeLean()` 改造：
```
目标 t = dot 存在 ? dot.x : fx
shy 中  → clamp((40 - t) / 40, -1, 1) * 2      // 头别开
level≥1 → clamp((t - 40) / 40, -1, 1) * 2.6     // 更主动
否则    → clamp((t - 40) / 40, -1, 1) * 2
```

---

## DON'T BUILD

- **C / D / E**（小物件、需求泡泡、梦境）——留档不做
- 后端 / 数据库 / 账号 / 登录 / 排行榜 / 成就
- 新增文件、构建工具、npm、框架
- 改变现有治愈调性（不加讽刺/惩罚元素）
- 改动 parts.js / parts-data.js / studio-track.js / 埋点协议
- 移动端专属逻辑（沿用现有指针事件，不做专门适配）
- 「以后可能需要」的抽象（记忆模块不拆文件、不泛化）

---

## Tasks

### Task 01 — 记忆模块

- **目标**：猫记得你。
- **输入**：IDEA B 段 + 本 plan 参数表。
- **输出**：
  - `memory` 读写（visits / petSec / leftAnnoyed / lastVisitAt），key `catmem_pixelcat`，读写都有 try/catch。
  - 加载时 `visits++` 并算 `level`（0/1/2）。
  - `visibilitychange(hidden)` 与 `pagehide` 时：写入累计 petSec；若 `annoy > 0.5` 置 `leftAnnoyed = true`。
  - 调试钩子 `window.CATDBG.getMemory()` 返回当前 memory。
- **验收**：控制台可见 memory；localStorage 里出现 `catmem_pixelcat`；刷新后 `visits` 递增、`level` 按 1/2/3 次正确变化。

### Task 02 — 首次问候与「先躲再和好」

- **目标**：第一次只是轻「喵」；被恼离开后再来，先躲 7 秒再靠近。
- **输入**：Task 01。
- **输出**：
  - 加载后 1.2s：`level 0` → 一次性轻「喵」（复用 `maoSound`）；`level ≥ 1` → 保持安静（不吵）。
  - `leftAnnoyed === true` → 设 `shyUntil = now + 7000`：
    - 期间 `gazeLean()` 反向（头别开）、耳微压（`earT` 目标 0.5）、不触发呼噜/主动回应。
    - 到点后一声「喵」恢复，并清掉 `leftAnnoyed`（持久化）。
  - 调试钩子：`window.CATDBG.shy()` 可强制进入躲闪。
- **验收**：首次打开只听一声喵；控制台设 `annoy` 后刷新，猫头别开约 7 秒再转回来并喵一声；摸头/肚子等原行为不受影响。

### Task 03 — 主动靠近（level 2）

- **目标**：高熟悉度下，猫在安静瞬间主动朝指针蹭一下。
- **输入**：Task 01、Task 02。
- **输出**：
  - `level ≥ 1`：`gazeLean()` 幅度提到 2.6（更主动看鼠标）。
  - `level 2` 且**本会话**累计抚摸 > 20s：在「安静瞬间」（未 holding、非 angry/asleep、距离上次事件 > 3s）触发一次主动蹭：
    - 猫头朝指针方向轻推一下（`headLean` 目标 ±3，持续约 600ms，用 `charms` 安排回位）。
    - 配一声软呼噜（复用 `mrrpSound`，低音量）。
    - 冷却 60s。
  - 调试钩子：`window.CATDBG.level()` 显示当前等级，`window.CATDBG.pet()` 可加会话抚摸时间。
- **验收**：把 level 强制为 2 并注入 pet 时间后，松开手挂机几秒，猫会自己朝指针方向蹭一下并软呼噜一声；不打断睡眠/发怒。

### Task 04 — 光点实体（出现 / 拖动 / 猫眼跟随）

- **目标**：有光点了，猫会看它，你能拖它。
- **输入**：IDEA A 段 + 本 plan 参数表。
- **输出**：
  - `SPRITES.dot`（3×3 红点，中心白高光）。
  - `dot` 对象 + 状态 `hidden / drift / grabbed`：
    - 调度：非 asleep/angry 时，上次结束后 `rand(20s,40s)` 出现，在画面内随机位置（避开头部区）。
    - `drift`：缓慢随机漂移（复用 wob 思路），停留 `rand(15s,25s)` 后消失。
    - `grabbed`：`pointerdown` 落在光点 `DOT_GRAB_R` 半径内 → 跟随指针（`pointermove` 更新）；`pointerup` 恢复 `drift`。
  - `gazeLean()` 目标切到光点（光点存在时优先于指针；holding 时不抢）。
  - render() 画光点（带脉冲，复用 anger 的 pulse 手法）。
  - 调试钩子：`window.CATDBG.dot()` 立即生成一个光点。
- **验收**：挂机 1 分钟内能看到光点出现；指针能抓住它拖动；猫头随光点位置转动；光点淡出消失。

### Task 05 — 扑击（扑中 / 扑空）

- **目标**：拖到面前它会扑。
- **输入**：Task 04。
- **输出**：
  - `pounce` 状态机 `idle → alert → pounce → recover`：
    - `grabbed` 且光点进入 `DOT_ZONE` → `alert`（竖耳：`earT→0`、`swayT→0`、`sqT→0`），持续 250ms。
    - 拖出区域 → 取消回 `idle`。
    - `alert` 结束 → `pounce`：
      - 记录光点此刻坐标；`catch = 距离(头部中心 40,18) < CATCH_R`。
      - 动作：`leanT = dir*4`（dir 朝光点方向）+ 一个尘土/风痕小 fx（新增 `SPRITES.dust` 或复用 `note` 变形）+ 一声「扑」音（可复用 `mrrpSound` 高音短促版）。持续 350ms。
    - 判定：`catch` → 光点化作小光点 fx 消散，`E + 0.05`，眯眼满意（`sqT→1` 短暂），点 30s 内不再生成；`miss` → 光点被弹开（快速漂离），猫 800ms 后装作没事（`recover`，表情自然）。
  - `POUNCE_CD` 内不允许再次扑。
  - 调试钩子：`window.CATDBG.pounce()` 强制触发一次。
- **验收**：拖光点到猫脸前能竖耳预警再扑；贴近扑中（光点消失 + 满意眯眼），故意没贴近扑空（光点弹走、猫恢复）；扑完猫自然回归，原抚摸/睡眠流程正常。

---

## 完成标准

按 Task 顺序做，每步调试钩子 + 验收通过再继续。全部完成：一只会记得你、会躲你、会看你、会扑光点、会在安静时主动蹭你的小方糕。原有用例（摸头/肚子/尾巴/睡着/发怒/分享/呼噜/埋点）全部不回归。
