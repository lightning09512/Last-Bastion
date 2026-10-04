# PROMPT: "LAST BASTION 2.0" — NÂNG CẤP ĐỒ HỌA & GAMEPLAY

> **Cách dùng:** copy toàn bộ file này (từ mục 1 tới hết) và dán vào AI coding agent đang mở repo `D:\hoc\GITHUB\Last Bastion`.
> Mục 13 là bản rút gọn nếu bạn cần một prompt ngắn. Phiên bản đầy đủ dưới đây đã được viết dựa trên việc đọc thật code hiện tại (mọi tham chiếu `file:line` đều kiểm chứng được).
> Ngôn ngữ làm việc: giải thích bằng tiếng Việt, code/comment/tên biến bằng tiếng Anh.

---

## 1. VAI TRÒ & NHIỆM VỤ

Bạn là **lead game developer + technical artist** cho tựa game tower-defense 2D "Last Bastion" (TypeScript + Vite + Canvas 2D). Nhiệm vụ của bạn là nâng cấp game này lên chuẩn thương mại kiểu **Kingdom Rush** ở **hai trục song song**:

1. **Đồ họa (Graphics):** từ "hình khối procedural vẽ bằng code" → "2.5D hand-painted look" có chiều sâu, ánh sáng, bóng đổ, animation, VFX, juice và UI chỉn chu.
2. **Gameplay:** từ "tower defense cơ bản chạy được" → "có chiều sâu chiến thuật, cân bằng, có meta-progression và lý do chơi lại".

Bạn **không được** viết lại game từ đầu. Bạn phải nâng cấp trên nền kiến trúc hiện có, giữ nguyên API công khai và không làm hỏng bất kỳ hệ thống nào đang chạy.

**Kết quả cuối cùng phải nộp:**
- Code đã sửa, `npm run build` (tsc strict + vite build) phải pass sạch.
- `docs/AUDIT.md`, `docs/ART_DIRECTION.md`, `docs/ROADMAP.md`, `docs/BALANCE.md` (nội dung yêu cầu ở mục 10).
- Một báo cáo cuối: mỗi thay đổi kèm `file:line`, số liệu đo trước/sau, và checklist nghiệm thu ở mục 11 đã tick.

---

## 2. BỐI CẢNH DỰ ÁN — BẮT BUỘC ĐỌC TRƯỚC KHI VIẾT DÒNG CODE NÀO

### 2.1 Stack
- `package.json`: `typescript ~5.7`, `vite ^6`, `three ^0.186` (dependency **chết**, xem 3.6). Không có test runner, không có linter, không có CI.
- `tsconfig.json`: `strict: true`, `noEmit`, `target ES2020`, `noUnusedLocals: false` (đang che các import chết).
- `index.html`: canvas `#game-canvas` + loading screen giả lập (progress do `setInterval` random, `src/main.ts:17-50`), font Google `MedievalSharp` + `Inter` (`index.html:9-11`), favicon `icon.jpg`. **Không có thư mục `public/`, không có một asset ảnh/âm thanh nào** — 100% đồ họa là code vẽ, 100% âm thanh là WebAudio tổng hợp.

### 2.2 Bản đồ file (đọc hết trước khi sửa)
| File | Vai trò | Ghi chú |
|---|---|---|
| `src/main.ts` | entry, loading screen giả | 51 dòng |
| `src/core/game.ts` | **god object 2365 dòng**: game loop + toàn bộ sim + hit-test UI + render level + HUD + tutorial + end screen | trái tim của dự án |
| `src/core/renderer.ts` | wrapper Canvas 2D, resize, panel/button/text/star/vignette | điểm vào của mọi thứ hình ảnh |
| `src/core/input.ts` | chuột + touch, map toạ độ màn hình → design space | 106 dòng |
| `src/core/audio.ts` | synth WebAudio 605 dòng, 20 SFX + nhạc trống war-drum | không có asset |
| `src/core/save.ts` | localStorage 1 key, không versioning | 45 dòng |
| `src/core/ads.ts` | stub quảng cáo, **không được import ở đâu** | 22 dòng |
| `src/core/pool.ts` | ObjectPool generic (projectile/text/particle) | không có cap |
| `src/core/utils.ts` | dist/lerp/normalize/angle/clamp/pointInCircle/seededRandom | `angle`, `normalize` đang bị import thừa ở game.ts:14 |
| `src/data/types.ts` | toàn bộ type + hằng số thiết kế | DESIGN 1280×720, FIXED_DT 1/60, SELL_REFUND_RATE 0.7, STAR_THRESHOLDS |
| `src/data/towers.ts` | 4 tower × 3 level × 2 spec | |
| `src/data/enemies.ts` | 7 enemy (6 thường + 1 boss) | có field `abilities` |
| `src/data/levels.ts` | 5 level × 8-9 wave | |
| `src/data/spells.ts` | 2 spell | **bị import nhưng không dùng** |
| `src/rendering/MapRenderer.ts` | terrain/path/props/gate/castle, có `LEVEL_THEMES` 5 bộ màu | chứa cả code 3D chết |
| `src/rendering/TowerRenderer.ts` | 4 loại tower × 3 level × spec, vẽ tay | |
| `src/rendering/EnemyRenderer.ts` | 7 enemy vẽ tay + health bar + frost | 1341 dòng |
| `src/rendering/ProjectileRenderer.ts` | đạn, floating text, particle | |
| `src/rendering/UIRenderer.ts` | title screen, world map parchment, HUD gỗ, modal | |
| `src/rendering/ThreeRenderer.ts` | **renderer WebGL 305 dòng chưa từng được khởi tạo** | chỉ 2 static helper đổi màu được dùng |

### 2.3 Hằng số thiết kế phải tôn trọng
- Design space cố định **1280×720** (`types.ts:130-131`), `FIXED_DT = 1/60` (`types.ts:132`), sell refund 70% (`types.ts:133`), 3 sao nếu mất ≤2 mạng, 2 sao nếu ≤8 (`types.ts:134`).
- Vòng lặp: accumulator fixed-step, delta clamp 0.1s (`game.ts:265-279`), **render không nội suy** → chuyển động giật trên màn 120/144Hz.
- Toạ độ: mọi thứ là pixel trong không gian 1280×720.

---

## 3. CHẨN ĐOÁN HIỆN TRẠNG (đã kiểm chứng bằng code)

### 3.1 Vòng lặp, pause, input — các lỗi phải sửa trước khi làm đẹp
1. **Không letterbox**: `renderer.ts:33-48` kéo giãn 1280×720 theo từng trục (`setTransform` với 2 scale khác nhau) → hình **méo** trên mọi màn hình không phải 16:9 (điện thoại dọc, 21:9, 4:3). `input.ts:34-42` map bằng cùng tỷ lệ đó nên click vẫn "khớp" nhưng bán kính hit-test (22/24/28/35px tại `game.ts:1619,1630,1587`) trở nên **không đối xứng**.
2. **Không nội suy render** (`game.ts:276`): sim 60Hz, vẽ trạng thái thô → giật trên màn hình tần số cao.
3. **Input có thể bị xử lý lặp**: `consumeClick()` chạy sau render (`game.ts:277`), trong khi `handleLevelInput()` chạy mỗi bước fixed-update → nhiều bước logic trong 1 frame có thể đọc cùng một sự kiện (hotkey 1/2 bật-tắt spell liên tiếp, `game.ts:1515-1528`).
4. **Pause bị hở**: khi `paused`, `updateLevel` chỉ chạy `handleLevelInput()` (`game.ts:531-535`) → **vẫn xây/nâng cấp/bán tower và vẫn cast spell trong lúc pause**. Dòng chữ "Click anywhere to resume" (`game.ts:1953`) là sai sự thật: chỉ nút pause 44×34 (`game.ts:213`) mới resume. Nhạc nền vẫn chạy (`audio.ts:557`).
5. **Âm thanh không bị chặn khi pause**; `menuTime` vẫn tăng khi pause (`game.ts:286`) nên mọi animation pulse vẫn động.
6. **Mute không được lưu**: `save.settings.muted` không bao giờ được đọc/ghi (`audio.ts:5,26-43`).

### 3.2 Đồ họa — đang có gì
- 5 bộ theme màu theo level trong `MapRenderer.ts:64-150` (grass/path/water/sky/ambient/fog/tree/rock/flower) → nền tảng tốt để làm art direction.
- Terrain + path được **pre-render vào canvas offscreen** rồi blit (`MapRenderer.ts:158, 1041-1113`) → hiệu năng nền ổn.
- Props: tree / rock / bush / mushroom / stump / bones / sign, có animation sway nhẹ (`MapRenderer.ts:509-812`).
- Spawn gate (`MapRenderer.ts:815`), castle base có cờ và emblem (`MapRenderer.ts:904-1020`).
- Tower: 4 loại, phân biệt được level và spec, có animation co giãn theo `animTimer` (`TowerRenderer.ts:20-80`, `game.ts:998-1010`).
- Enemy: mỗi loại vẽ tay riêng, walk cycle 4 frame bằng biến đổi hình học, hit flash, bóng ellipse, health bar có gradient + badge giáp/kháng phép, overlay frost (`EnemyRenderer.ts:995-1150`).
- Title screen: pháo đài, lửa braziers, ember bay, crest (UIRenderer 1104+). World map: giấy da, núi, rừng, la bàn, quái biển, dấu mộc (UIRenderer 14-753).
- Vignette (`renderer.ts:100-110`). Screen shake **chỉ tồn tại trong ThreeRenderer chết** (`ThreeRenderer.ts:150-153`) → hệ thống Canvas 2D đang chạy **không có screen shake**.

### 3.3 Đồ họa — thiếu gì (danh sách thẳng thắn)
1. Không có **pipeline sprite/atlas**: mỗi entity được vẽ lại từ đầu bằng path mỗi frame → không thể làm art chi tiết hơn mà vẫn giữ 60fps, và không thể dùng ảnh vẽ tay sau này.
2. **Thứ tự vẽ sai**: nền → props → path → slot → tower → soldier → enemy (`game.ts:1849-1896`). Enemy luôn vẽ đè lên tower/props dù đứng "sau" → phá vỡ cảm giác 2.5D. Không có **y-sorting** (painter's algorithm).
3. **Không có hệ thống ánh sáng/bóng nhất quán**: mỗi chỗ tự vẽ bóng với alpha/offset khác nhau (enemy 0.25, flying 0.18, tower tự vẽ), không có hướng nắng, không có bóng dài, không có contact shadow, không có ambient occlusion dưới chân công trình.
4. **Không có post-processing**: chỉ có vignette. Không bloom/glow cho phép thuật và lửa, không color grading, không heat haze, không fog layer, không parallax nhiều lớp, không depth-of-field giả.
5. **VFX nghèo**: particle là `ctx.arc` 2-5px rơi theo gravity (`game.ts:1168-1183, 1908-1917`); nổ không có flash/shockwave/khói/decal; không có hiệu ứng cho slow/poison/stun; chết là biến mất tức thì (không animation chết, không xác, `game.ts:834`).
6. **Không có animation trạng thái**: `Tower.animTimer` chỉ là 1 số vô hướng (`game.ts:103`); không có idle/aim/fire/recoil/muzzle flash; đạn không xoay theo hướng bay (`ProjectileRenderer.ts:271+`).
7. **Icon bằng emoji** (🏹🔮💣⚔🔥🛡💰⭐) ở `towers.ts`, `game.ts:1990-2001`, radial menu → font phụ thuộc hệ điều hành, lệch baseline, nhìn nghiệp dư.
8. **UI tĩnh**: button chỉ đổi màu khi hover (`renderer.ts:143-183`), không có press state/scale/transition, không tooltip trừ radial menu (`game.ts:2211-2220`), không animation mở/đóng modal, không chuyển cảnh giữa các screen.
9. **Không có weather / day-night / biome variety theo wave**, không có ambient particle (lá bay, đom đóm, tro, tuyết).
10. **Không có accessibility hình ảnh**: không chế độ colorblind, không scale UI, không giảm chớp/nháy, text 10-13px (`game.ts:2196,2285`).
11. **Không có "juice"**: không hit-stop, không camera punch/zoom khi boss xuất hiện, không coin bay về HUD, không số mạng rung khi mất mạng, không slow-motion khi thắng.
12. Loading screen **giả** (`main.ts:16-50`): thanh progress random, không bake asset thật.
13. **Frost overlay là đồ trang trí**: `enemy.slowed` không bao giờ được gán (xem 3.5) → hiệu ứng băng không bao giờ xuất hiện.
14. **Chỉ 2/8 loại prop được dùng**: `generateDecorations` chỉ sinh `tree`/`rock` (`game.ts:519-524`), dù `MapRenderer.ts:440-507` có 8 loại (bush/mushroom/stump/bones/sign…); **mọi cây đều dùng `variant 0`** vì `renderer.ts:91` để mặc định → rừng lặp y hệt nhau.
15. **Nền bị "sọc chéo"**: 350 bụi cỏ + 60 hoa đặt theo **lưới số học** `(i*137.5)%W`, `(i*89.3)%H`, `(i*211.3)%W` (`MapRenderer.ts:1083-1106`) → mắt thấy banding chu kỳ; màu hoa hardcode `#fef08a/#fda4af/#93c5fd` (`MapRenderer.ts:1102`) bỏ qua `theme.flowerColors`.
16. **Dữ liệu theme bị bỏ phí**: `waterColor`, `skyGradient`, `ambientLight`, `fogColor`, `fogDensity` được khai báo (`MapRenderer.ts:53-57`) nhưng **không nơi nào trong đường chạy dùng** → "Dark Swamp"/"Warlord's Gate" chỉ khác màu cỏ; không có nước, không có vách đá, level 5 "núi lửa" chỉ là cỏ nâu hơn.
17. **Gate và Castle không nhận theme** (`MapRenderer.ts:1202,1271`): mọi level dùng đúng một cổng xám và một thành xám; "golden lion emblem" thực chất là **một hình chữ nhật vàng** (`MapRenderer.ts:1336-1337`).
18. **Không tồn tại renderer cho vụ nổ/va chạm**: splash chỉ là 6 hạt `#ff6600` tại một điểm (`game.ts:1121-1125`); path đang chạy không có sỏi/đá/cỏ ven đường (chỉ bản 3D chết có).
19. **Nhiều "icon" thực chất là ký tự text**: stun = glyph `'⚡'` (`TowerRenderer.ts:946-951`), build slot = glyph `'+'`, pause/speed = `'▶'/'❚❚'/'1x'/'2x'` (`UIRenderer.ts:1697`) → lệch baseline, khác nhau theo OS.
20. **Nợ kiến trúc chặn nâng cấp hình ảnh**: interface enemy/soldier bị **định nghĩa trùng** (`EnemyRenderer.ts:9-37` vs `game.ts:25-68`), `Tower.animTimer` chỉ là 1 scalar không đủ cho state machine, phụ thuộc font Google cứng trong `index.html:9-11`, không có asset pipeline, mọi bán kính/kích thước pixel hardcode theo bề mặt 1280×720 bị kéo giãn.

### 3.4 Gameplay — đang có gì
- 4 tower (archer/mage/cannon/barracks) × 3 level × 2 spec; 7 enemy; 5 level × 8-9 wave; 2 spell; 1 boss (`orc_warlord`).
- Targeting theo data cố định (first/strongest/closest, `game.ts:1018-1051`); splash toàn phần không suy giảm (`game.ts:1116-1124`); projectile pool 100 (`game.ts:236-240`); barracks 2 lính, respawn 10s (`game.ts:722,1268`); spell cooldown 30/20s; sao lưu localStorage; world map mở khoá theo sao level trước (`game.ts:434`).
- Điểm cộng: damage có áp dụng armor/magicResist đúng (`game.ts:851-862`), wave clear logic chặt (`game.ts:606-620`), path math ổn định, `totalPathDist` dùng đúng cho "first".

### 3.5 DỮ LIỆU vs CODE lệch nhau (phải thống nhất — đây là ưu tiên số 1 của gameplay)
| Hạng mục | Dữ liệu (nguồn) | Code thực tế | Hệ quả |
|---|---|---|---|
| Dark Shaman heal | 5 HP / 3s, range 80 (`enemies.ts:56`) | +12 HP / 3.5s (`game.ts:733-744`) | Mạnh hơn thiết kế ~2.4× |
| Troll regen | 4 HP / 1s (`enemies.ts:85`) | +5 HP / 1s (`game.ts:745-751`) | +25% |
| Orc Warlord | summon 3 goblin/10s; stun 120px/2s/8s (`enemies.ts:101-102`) | summon 2/9s; stun 130px/2.5s/9s (`game.ts:752-777`) | Lệch; goblin triệu hồi teleport vào giữa base (`game.ts:762-765`) |
| Rain of Fire | 80 dmg, r=80, delay 0.8s, cd 30 (`spells.ts:8-11`) | 50 dmg, r=65, 5 meteor, cd 30 (`game.ts:1412,1429-1430`) | `SPELLS` import thừa, không dùng |
| Reinforcements | cd 20, duration 15 (`spells.ts:18-19`) | 60 HP, 8 dmg, 0.9s, lifespan 16 (`game.ts:1436,1449-1459`) | — |
| Sharpshooter | 25% cơ hội ×3 crit (`towers.ts:49`) | **không tồn tại** | Spec vô nghĩa |
| Slow Hex | slow 40% trong 3s (`towers.ts:135`) | nhánh rỗng (`game.ts:1135-1139`); `slowed`/`slowFactor` **không bao giờ được gán** | Slow không tồn tại; frost FX chết |
| Cluster Bombs | 4 mini-nổ (`towers.ts:204`) | không tồn tại (dùng như cannon thường) | Spec vô nghĩa |
| Knights | double HP + hồi máu (`towers.ts:262`) | chỉ đổi HP 180 (`game.ts:1242`) | Không hồi máu |
| Rangers | dmg cao + đánh nhanh (`towers.ts:277`) | **y hệt barracks thường** (`game.ts:1243,1283`) | Spec hoàn toàn vô tác dụng |
| Barracks level dmg | 5/10/18 (`towers.ts:227-254`) | 7 + level×5 = 7/12/17 (`game.ts:1243`) | Lệch |
| Soldier attack speed | fireRate 1.0/1.1/1.2 | 0.8s cố định (`game.ts:1283`) | Lệch |
| Enemy đánh lính | — | `max(5, 8% maxHp)` mỗi 0.8s (`game.ts:715`) | Warlord đánh 64 dmg/lính 180HP |
| Máu enemy theo level | — | **không scale**, chỉ tăng số lượng | Level 4-5 nhàm, dễ snowball |

### 3.6 Nợ kỹ thuật phải dọn (chặn mọi nâng cấp)
1. **Three.js là dependency chết**: `new ThreeRenderer` không tồn tại ở đâu; chỉ 2 static helper `lighten/darken` được dùng (`TowerRenderer.ts:263,401,430,587`, `MapRenderer.ts:568,619`, `UIRenderer.ts:7`). `import * as THREE` kéo cả three vào bundle. `MapRenderer.renderSpawnGate/renderBase/renderDecoration` (`:815,904,509`), `TowerRenderer.renderTower` (`:20`), `EnemyRenderer.renderEnemy` (`:41`), `ProjectileRenderer.renderProjectile/renderFloatingText/renderParticle` (`:42,201,250`) là code chết.
2. **Rò rỉ texture tiềm ẩn trong code chết**: `EnemyRenderer.renderEnemy` bake texture mới cho từng nấc HP (`EnemyRenderer.ts:167-236`) → cache texture phình vô hạn nếu ai đó bật lại đường 3D.
3. **`game.ts` là god object 2365 dòng**: sim + hit-test UI + render + balance literal trộn lẫn. Balance hardcode rải rác (`game.ts:715,1242-1243,1350,1429-1459`).
4. **Không có test/CI** (`package.json:6-10`), `noUnusedLocals:false` che import chết (`game.ts:14`).
5. **Pool không có cap** (`pool.ts:19`): chết dây chuyền 15 goblin vượt 40 floating text → text bị bỏ im lặng; `release()` dùng `indexOf` O(n).
6. **Bug logic cụ thể cần fix**: (a) lính reinforcement hết `lifespan` (16s) vẫn được hồi sinh thành lính thường vĩnh viễn sau 10s vì nhánh revive không kiểm tra lại `lifespan` (`game.ts:1308-1321` vs `1246-1258`); (b) enemy bay không bao giờ `facingLeft` vì chỉ set trong nhánh path bộ (`game.ts:824`) → bay ngược hướng; (c) stun không áp dụng cho barracks (`game.ts:986-995`); (d) projectile mất target thì biến mất, không re-target (`game.ts:1097-1102`); (e) splash không suy giảm và cộng dồn khi nhiều meteor trùng nhau (`game.ts:1401`); (f) `tutorialDismissed` không bao giờ được set `true` → tutorial không thể tắt (`game.ts:479,1944`); (g) `timeBetweenWaves` gán 15 rồi ghi đè 5 ở level start (`game.ts:460,484`).

### 3.7 Cân bằng hiện tại (số liệu để bạn sửa, không phải để giữ nguyên)
| Tower | DPS L1/L2/L3 | Tổng chi phí tới L3 | DPS/gold (L3) |
|---|---|---|---|
| Archer | 9.6 / 19.6 / 35.2 | 70/180/340 | 0.104 |
| Mage | 10.8 / 25.2 / 44.8 | 100/260/500 | 0.090 |
| Cannon (splash) | 10 / 22 / 39 | 125/315/595 | 0.066 |
| Barracks (2 lính) | 8.75 / 15 / 21.25 | 70/180/340 | 0.063 |
| **Rapid Volley** | **90** | 570 | **0.158** |
| Sharpshooter | 36 (chưa có crit) | 570 | 0.063 |
| Arcane Blast | 54 | 800 | 0.068 |
| Heavy Bombard | 40 | 945 | 0.042 |
| Cluster Bombs | 27.5 (chưa có mini-nổ) | 945 | 0.029 |
| Knights | 27.5 | 570 | 0.048 |
| Rangers | 43.75 (đang = barracks) | 570 | 0.077 |

Kết luận: **Rapid Volley mạnh gấp ~2.5× mọi spec khác và là spec duy nhất được implement thật**; cannon/cluster/heavy bombard lãng phí gold; bonus gọi wave sớm (+15…+60 mỗi wave, tổng 185g ở level 1 và 300g ở level 5) là nguồn snowball lớn nhất; enemy không tăng HP theo level.

---

## 4. ĐỊNH HƯỚNG NGHỆ THUẬT (ART DIRECTION) — BẮT BUỘC TUÂN THỦ

Mọi thay đổi hình ảnh phải nhất quán với spec này. Nếu bạn thấy spec mâu thuẫn với khả năng kỹ thuật, hãy viết lại spec trong `docs/ART_DIRECTION.md` rồi mới code.

### 4.1 Phong cách
- **"Hand-painted 2.5D fantasy"** kiểu Kingdom Rush / Warcraft-ish: nét vẽ dày có viền tối (outline màu tối, không phải đen tuyền), mảng màu lớn, gradient nhẹ, highlight lệch sáng, texture noise rất nhẹ.
- Nhìn từ **góc nghiêng giả lập** (top-down nhưng mọi vật thể được "dựng đứng" theo trục Y màn hình).
- Silhouette là ưu tiên số 1: ở zoom 100%, người chơi phải phân biệt được từng loại đơn vị trong **≤0.2 giây** chỉ bằng hình dáng + màu.
- Không dùng emoji ở bất kỳ đâu trong game. Không dùng font mặc định hệ thống. Không dùng ảnh chụp/asset vi phạm bản quyền.

### 4.2 Camera & không gian
- Giữ design space 1280×720 nhưng **letterbox đúng tỷ lệ 16:9**; vùng thừa là nền tối có vignette + logo mờ; HUD đặt trong **safe area 24px** để không bị cắt trên thiết bị có tai thỏ.
- Thêm **3 lớp parallax** cho nền (bầu trời/núi xa → rừng giữa → mặt đất) dịch chuyển 2-6px theo con trỏ (rất nhẹ, có easing, có thể tắt trong settings).
- Thang đo chuẩn hoá (đặt thành token dùng chung): 1 tile = 40px; prop nhỏ 24-40px; prop lớn 80-140px; tower 64-96px chiều cao; enemy 24-48px; boss 96-128px; HUD icon 32px.
- Trục "độ cao" giả lập: mọi vật thể có `elevation` (px) để tính shadow offset và y-sort.

### 4.3 Ánh sáng & bóng (bắt buộc thống nhất)
- Nắng cố định từ **góc trên-trái (hướng 315°)**. Hệ quả: highlight ở cạnh trên-trái của mọi khối, bóng đổ về **dưới-phải**.
- 2 loại bóng: **contact shadow** (ellipse tối đậm `rgba(20,14,30,0.35)`, dẹt, ngay dưới chân) và **cast shadow** (ellipse mờ `rgba(20,14,30,0.18)`, offset = `0.35 × elevation` sang phải và `0.5 × elevation` xuống, blur bằng radial gradient).
- Bóng phải nằm ở **layer riêng, vẽ trước mọi entity** để không đè lên nhau.
- Mỗi level có **ambient tint** (đã có trong `LEVEL_THEMES.ambientLight`): áp bằng overlay `globalCompositeOperation = 'multiply'` alpha 0.06-0.12 + overlay ấm `'overlay'` alpha 0.05.

### 4.4 Bảng màu (mở rộng từ theme hiện có, không thay thế)
Giữ `LEVEL_THEMES` (`MapRenderer.ts:64-150`) và bổ sung cho mỗi theme 6 token mới: `shadowTint`, `rimLight`, `fogTint`, `uiAccent`, `vfxPrimary`, `vfxSecondary`. Ví dụ theme `level_1` (Green Valley):
```
grassBase #4a8e3a · grassHighlight #5eab4a · grassDark #3a7a2e
pathBase #c4a06a · pathLight #ddc08a · pathDark #8a7040
shadowTint rgba(24,40,20,0.35) · rimLight #d8f5a0 · fogTint #cfe8c0
uiAccent #f0c040 · vfxPrimary #ffb648 · vfxSecondary #ffe9a8
```
Quy tắc chung: mỗi vật thể 3 sắc độ (base/shadow/highlight) + 1 viền tối; màu phe ta (tower/lính) thiên **vàng-đồng-xanh dương**, phe địch thiên **lục-đỏ-tím**; màu VFX phép thuật **tím-lam**, lửa **cam-vàng**, băng **lam-trắng**.

### 4.5 Nguyên tắc animation (áp dụng cho MỌI thứ chuyển động)
1. **Squash & stretch**: lính/enemy khi bước có scaleY 1.0→0.94→1.0; khi nhận đòn squash 90ms (`scaleX 1.12, scaleY 0.88`) rồi hồi.
2. **Anticipation**: trước khi bắn, tower nghiêng/lùi 80-120ms; trước khi boss ra đòn, viền đỏ nhấp nháy 400ms.
3. **Follow-through**: nỏ giật ngược sau khi bắn 120ms; pháo nòng lùi 8px rồi trả về; nắp đậy nảy nhẹ.
4. **Secondary motion**: cờ, áo choàng, lá cây, dây cung, tua rua trên mái tower luôn động chậm hơn vật thể chính 1 pha.
5. **Hit-stop**: đòn nặng (pháo, meteor, boss slam) đóng băng toàn cục 60-90ms.
6. **Easing**: mọi chuyển động UI/di chuyển dùng ease-out (cubic) — **không dùng linear** trừ khi là vòng xoay liên tục.
7. **Không có chuyển động nào đứng yên tuyệt đối**: mọi entity có idle bob biên độ 1-2px, chu kỳ 1.2-2.2s, lệch pha theo `id`.
8. **Frame rate animation**: sprite bake ở 8-12 fps cho walk cycle (4-6 frame), nhưng biến đổi (bob/nghiêng/scale) chạy ở 60fps.

### 4.6 UI / Typography
- Khung UI: **9-slice** gỗ/parchment có 3 lớp (bóng ngoài, viền tối, mặt trong có inner highlight), không vẽ lại path mỗi frame — bake 1 lần.
- Nút: hover scale 1.03 + sáng 8% trong 120ms; press dịch xuống 2px + tối 10%; disabled giảm saturation 60% + alpha 0.6; luôn có feedback âm thanh.
- Typography: `MedievalSharp` cho tiêu đề/số mạng, `Inter` cho số liệu và tooltip; **tối thiểu 12px** (tooltip 13px, số vàng/máu 18-20px); dùng `tabular-nums` cho mọi số thay đổi liên tục để không nhảy layout.
- Tooltip: xuất hiện sau 150ms hover, theo con trỏ, không bị cắt mép màn hình (tự lật hướng).
- Mọi icon phải là **vector vẽ bằng code rồi bake** (24/32/48px), không emoji.

### 4.7 Ngân sách hiệu năng (không được vượt)
- 60fps ổn định trên laptop tầm trung ở 1920×1080 với **≥80 enemy + ≥400 particle** cùng lúc; frame time p95 ≤ 12ms.
- ≤ 1200 lệnh vẽ Canvas/frame; `ctx.filter`/blur chỉ dùng trên canvas phụ nhỏ (≤ 320×180), không bao giờ trên toàn màn hình mỗi frame.
- Particle cap cứng 600 (pool), floating text cap 60, decal cap 40 (xoá cũ nhất).
- Mọi lớp tĩnh (terrain, path, props không động, khung UI) phải **bake vào offscreen canvas** và chỉ blit lại; chỉ vẽ lại khi đổi level/resize.
- DPR cap 2. Có debug overlay (F1) hiển thị fps, frame time p95, số entity, số particle, số lệnh vẽ ước tính.

---

## 5. WORKSTREAM A — ĐỒ HỌA (làm theo đúng thứ tự A0 → A18)

Với mỗi task: nêu rõ mục tiêu, cách làm, file đụng tới, và điều kiện hoàn thành (DoD). Không nhảy task khi task trước chưa build pass.

**A0. Letterbox + safe area + input đúng tỷ lệ**
- Viết `src/core/viewport.ts`: tính `scale = min(w/1280, h/720)`, `offsetX/offsetY`, cung cấp `screenToWorld()`, `worldToScreen()`, `safeArea` (24px), `getDpr()` (cap 2).
- Sửa `renderer.ts:33-48` để dùng viewport (uniform scale + translate), sửa `input.ts:34-42` dùng cùng hàm.
- Thêm 2 dải letterbox tối + vignette nhẹ, HUD tự co theo safe area.
- **DoD:** ở 4:3, 21:9, điện thoại dọc, và 1366×768 hình **không méo**; vòng tròn range là hình tròn thật; click vào tâm một build slot ở mọi tỷ lệ đều trúng.

**A1. Nội suy render (fix giật trên màn 120Hz)**
- Lưu `prevPos/currPos` cho enemy, soldier, projectile; truyền `alpha = accumulator / FIXED_DT` vào render; nội suy vị trí khi vẽ (`game.ts:265-279, 1841-1955`).
- **DoD:** chuyển động mượt trên màn 144Hz (kiểm tra bằng debug overlay + quay chậm).

**A2. Sprite Bank + Atlas (nền tảng của mọi thứ đẹp hơn)**
- Thêm `src/rendering/SpriteBank.ts`: bake mọi sprite vào `OffscreenCanvas` (fallback `document.createElement('canvas')`), cache theo key có cấu trúc: `enemy:<type>:<state>:<frame>:<facing>`, `tower:<type>:<level>:<spec>:<state>:<frame>`, `prop:<theme>:<kind>:<variant>`, `ui:<name>:<size>`.
- LRU cache có giới hạn (ví dụ 400 entry, mỗi entry ≤ 512×512) để không phình RAM; hàm `getSprite(key, w, h, drawFn)`.
- Chuyển `drawEnemyDirect` / `drawTowerDirect` / `drawBuildSlotDirect` (`EnemyRenderer.ts:995`, `TowerRenderer.ts:905,956`) sang `drawImage(sprite, ...)`; giữ nguyên hàm vẽ để bake.
- **DoD:** cùng một frame logic, số lệnh vẽ giảm ≥40%; 80 enemy vẫn 60fps; không có texture/canvas rò rỉ (kiểm tra `performance.memory` hoặc đếm entry trước/sau 2 phút chơi).

**A3. Y-sorting + elevation (sửa sai thứ tự vẽ)**
- Gom mọi thứ động vào 1 mảng renderable `{ y, elevation, layer, draw() }`; sort theo `y + elevation*bias` mỗi frame (sort gần như đã sắp xếp nên rất rẻ); bóng và decal nằm layer nền.
- **DoD:** enemy đi phía sau tower bị tower che đúng; 2 enemy chồng nhau thì con ở dưới vẽ sau.

**A4. Hệ thống ánh sáng & bóng thống nhất**
- `src/rendering/Lighting.ts`: `drawShadow(ctx, x, y, w, elevation, type)`, áp dụng cho mọi entity/prop/tower.
- Thêm rim-light cho tower/enemy (stroke sáng 1px ở cạnh trên-trái), contact shadow, cast shadow.
- **DoD:** toàn bộ 5 level nhìn như cùng một nguồn sáng; bóng không đè lên HUD/đường (clip theo layer).

**A5. Terrain đa lớp + biome**
- Mở rộng `generateTerrain` (`MapRenderer.ts:158`): 3 lớp parallax (xa/giữa/gần), vách đá có cạnh sáng-tối, bờ nước có foam động, cỏ có sóng gió (batch theo cụm, không vẽ từng lá).
- **Sửa lỗi thẩm mỹ đã xác định**: thay lưới số học `(i*137.5)%W` (`MapRenderer.ts:1083-1106`) bằng phân bố jittered-grid/poisson để hết banding; dùng `theme.flowerColors` thay vì màu hardcode (`MapRenderer.ts:1102`); dùng hết 8 loại prop với **variant ngẫu nhiên** thay vì luôn `variant 0` (`renderer.ts:91`, `game.ts:519-524`).
- **Dùng các field theme đang bỏ không**: `waterColor` cho sông/hồ có animation sóng + phản chiếu, `skyGradient` cho lớp trời nếu có, `ambientLight` cho color grade, `fogColor`/`fogDensity` cho lớp sương — đây là các field đã khai báo ở `MapRenderer.ts:53-57` nhưng chưa từng dùng.
- Thêm decal nền: vết bánh xe trên đường, ổ gà, sỏi/đá/cỏ ven đường (bản 3D chết đã có sẵn ý tưởng ở `MapRenderer.ts:355-420`), vũng nước phản chiếu mờ, vết máu/xác cũ mờ dần.
- Gate và Castle phải nhận theme (hiện `MapRenderer.ts:1202,1271` không nhận theme, mọi level giống nhau) và emblem trên banner phải là hình vẽ thật (hiện là hình chữ nhật vàng, `MapRenderer.ts:1336-1337`).
- **DoD:** ảnh chụp màn hình level 1 và level 4 phải khác nhau rõ rệt về không khí; hết banding chéo; nền tĩnh vẫn bake 1 lần.

**A6. Props sống**
- Mỗi theme ≥8 loại prop, ≥3 biến thể kích thước; thêm animation: cây đung đưa, bụi cỏ rung, braziers lửa + khói, cờ bay, chim bay ngang, đom đóm/tro/tuyết tuỳ theme.
- Thêm **ambient particle system** theo theme (lá bay ở Forest Pass, tro ở Warlord's Gate, đom đóm ở Dark Swamp).
- **DoD:** không có vùng nền nào "chết" trong 3 giây nhìn liên tục; ambient particle ≤120 hạt.

**A7. Weather + day/night (theo wave hoặc theo level)**
- 4 preset: clear / rain (hạt mưa + vệt nước + tối trời) / fog (dải sương trôi ngang, giảm tầm nhìn bằng overlay) / storm (mưa + chớp + screen flash rất nhẹ).
- Chọn preset bằng data level (`levels.ts`) hoặc đổi ở wave cao (wave ≥5 mưa, boss wave bão).
- **DoD:** weather không làm rớt quá 5% fps; có option tắt trong settings.

**A8. Tower: 4 trạng thái animation + silhouette theo spec**
- Viết state machine nhỏ: `idle → aim → fire → recoil → idle`, cộng `build` (0.6s dựng giàn giáo + bụi) và `upgrade` (burst sáng + mảnh vụn) và `damaged` (khói khi HP/trụ bị stun).
- Turret **xoay theo hướng mục tiêu** (lerp góc, tốc độ 6 rad/s), có muzzle flash 60ms đúng vị trí nòng; archer có dây cung kéo; mage có orb tích năng lượng; cannon có nòng lùi + khói; barracks có cờ hiệu + lính chạy ra.
- Phân biệt spec bằng silhouette + phụ kiện (Sharpshooter có ống ngắm/áo choàng; Rapid Volley có bao tên; Arcane Blast có 3 orb; Slow Hex có băng đá; Heavy Bombard nòng to; Cluster Bombs thùng đạn chùm; Knights giáp vàng; Rangers mũ lông + ngựa/giáo).
- Thay các "icon bằng ký tự" trong tower: stun hiện là glyph `'⚡'` tại `cy-35` (`TowerRenderer.ts:946-951`), build slot là glyph `'+'` (`TowerRenderer.ts:956-1006`) → chuyển thành icon vector + VFX thật (vòng xoáy choáng trên đầu tower, khung slot có animation pulse).
- **DoD:** chụp 4 tower × 3 level × 2 spec thành 1 sheet và phân biệt được bằng mắt thường; không dùng chung một hình cho 2 spec.

**A9. Enemy: animation đầy đủ + biến thể elite**
- 4-6 frame walk cho mỗi loại (dựa trên `walkCycle` hiện có nhưng vẽ biên độ lớn hơn), thêm **attack animation** (vung vũ khí/lao tới), **hit reaction**, **death animation** (ngã + mờ dần 350ms + để lại decal 3-5s), **spawn animation** (bụi cổng/khói triệu hồi).
- Sửa hướng mặt cho enemy bay (bug 3.6b) và cho enemy bị chặn (phải quay về phía lính).
- Biến thể elite/boss: tint màu + phụ kiện (giáp, khiên, hào quang), scale 1.15×, HP bar to hơn, và **aura** cho elite.
- **DoD:** giết 1 enemy phải "đã" (death anim + particle + decal + âm thanh); không có enemy nào biến mất tức thì.

**A10. Projectile & impact**
- Đạn có hướng xoay theo vận tốc; trail thuôn nhỏ dần, mờ dần; mũi tên **cắm lại** trên đất 2s rồi mờ; cannon bay theo **đường parabol thật** (thêm trường `arc` cho projectile) + bóng đổ trên mặt đất; orb phép có glow pulse + hạt lấp lánh.
- Thêm **đạn nổ chùm** (Cluster Bombs), đạn xuyên (nếu cần cho spec mới), đạn nảy.
- **DoD:** phân biệt được đạn archer/mage/cannon chỉ bằng hình dáng; splash trông to đúng bằng bán kính sát thương.

**A11. Thư viện VFX**
- Viết `src/rendering/VFX.ts` với các recipe dựng sẵn: `explosion`, `frostBurst`, `fireLick`, `lightning`, `holySmite`, `poisonCloud`, `dust`, `debris`, `shockwave`, `smokePuff`, `coinPop`, `blood(style hoá thành tia sáng)`, `healGlow`, `shieldBreak`, `stunStars`.
- Mỗi recipe gồm: flash (1-2 frame), vòng shock, khói, mảnh vụn, decal (scorch), âm thanh — với thời lượng và easing định sẵn.
- Screen shake cho các sự kiện nặng: pháo nổ 3px/180ms, meteor 8px/400ms, boss slam 10px/500ms, base bị đánh 6px/300ms + viền đỏ màn hình.
- **DoD:** mỗi hành động quan trọng đều có VFX riêng; tổng particle không vượt cap.

**A12. Post-processing (2D composite)**
- Viết `src/core/postfx.ts`: (1) lớp **glow** additive cho lửa/phép/VFX sáng (vẽ vào canvas phụ 640×360 rồi blit với `globalCompositeOperation='lighter'`, blur bằng downsample chứ không dùng `ctx.filter` toàn màn hình); (2) **color grade** overlay theo theme; (3) **vignette** hiện có (giữ); (4) **fog layer** theo theme; (5) tuỳ chọn **film grain** rất nhẹ 2%.
- Thêm **camera juice**: shake (đã có ở A11), punch zoom 1.0→1.03 khi boss xuất hiện, zoom 1.06 khi thắng, parallax theo trỏ (2-6px).
- **DoD:** cảnh đêm/level 5 trông "điện ảnh" hơn rõ rệt mà fps không tụt quá 8%.

**A13. HUD & UI juice**
- Số vàng tween khi thay đổi + **đồng xu bay theo đường cong về HUD**; số mạng **rung + flash đỏ** khi mất mạng; banner wave trượt vào với hiệu ứng da/gỗ.
- Cooldown spell: radial sweep đã có (`game.ts:2063-2074`) → thêm vòng sáng "ready" pulse + âm thanh khi hồi xong.
- Panel tower: bảng so sánh chỉ số **trước/sau khi nâng cấp** (mũi tên xanh/đỏ), hiển thị DPS, tầm bắn, loại sát thương, và nút priority.
- Tooltip có delay 150ms, tự lật hướng, hiển thị cả khi hover lên enemy (tên, HP, giáp, kháng phép, tốc độ, thưởng vàng).
- **DoD:** mọi nút đều có hover/press/disabled state; không còn chữ 10px nào.

**A14. Title screen, world map, chuyển cảnh**
- Title: mây trôi, biển động, chim, cờ, lửa; logo có parallax theo trỏ; nút "TO BATTLE" có animation press.
- World map: node hover scale 1.08 + glow; đường route là nét đứt **chạy** (dash offset animate); modal briefing mở bằng ease-out 200ms + scroll trượt xuống; thêm huy hiệu "3 sao" và "hoàn hảo" trên node.
- Chuyển cảnh: wipe parchment 350ms khi vào/ra level, fade khi victory/defeat, không cắt cứng.
- **DoD:** không còn màn hình nào chuyển tức thì không animation.

**A15. Thay emoji bằng icon vector**
- `src/rendering/Icons.ts`: bake icon 24/32/48px cho archer, mage, cannon, barracks, 8 spec, gold, lives/heart, wave, pause, play, speed, sell, upgrade, spell RoF, spell reinforce, star, lock, sound on/off, settings, back, close, info, priority (first/last/strong/weak/closest).
- Thay ở `towers.ts` icon, radial menu (`game.ts:1649-1690,1697-1755`), spell buttons (`game.ts:1986-2003,2058-2061`), tutorial, world map, modal lore (`UIRenderer.ts:1617-1622`), pause/speed (`UIRenderer.ts:1697`), stun (`TowerRenderer.ts:946`) và build slot (`TowerRenderer.ts:956`).
- **DoD:** `grep -nE "🏹|🔮|💣|⚔|🔥|🛡|💰|⭐|🌟|⬆|👆|❤|⚡|▶|❚|✕" src/` trả về **0** kết quả (bao gồm cả glyph điều khiển `▶ ❚❚ ✕` và dấu `+` vẽ bằng `fillText`).

**A16. Accessibility hình ảnh**
- 3 preset UI scale (100/115/130%) áp cho HUD và font.
- Chế độ colorblind: mọi enemy có thêm **pattern/ký hiệu** (sọc, chấm, viền) và shape badge trên HP bar; VFX phân biệt bằng hình dạng chứ không chỉ màu.
- Option "reduced motion" (tắt parallax, giảm shake, tắt ambient particle) và "no flashing" (giới hạn chớp ≤3Hz).
- **DoD:** bật từng option trong settings thấy thay đổi ngay, không cần reload.

**A17. Loading thật + asset pipeline sẵn sàng cho ảnh vẽ tay**
- Thay progress giả (`main.ts:16-50`) bằng bake thật: đăng ký từng nhóm sprite cần bake và báo tiến độ thực; hiển thị "tip" xoay vòng.
- Viết loader có thể đọc sprite sheet PNG từ `public/` nếu sau này có art thật (hàm `loadAtlas(url, json)`), nhưng **không bắt buộc phải có asset** để game chạy.
- **DoD:** thanh loading phản ánh tiến độ bake thật; lần chơi đầu tiên vào game < 2s trên máy tầm trung.

**A18. Debug/đo lường hình ảnh**
- Overlay F1: fps, frame time p50/p95, số entity, số particle, số sprite bake, cache hit rate, số lệnh vẽ.
- Lệnh ẩn `?debug=1` bật hit-box, shadow layers, y-sort order.
- **DoD:** đo được số liệu trước/sau cho báo cáo.

---

## 6. WORKSTREAM B — GAMEPLAY (làm song song được với A, nhưng theo thứ tự B0 → B19)

**B0. Data-driven toàn bộ (ưu tiên tuyệt đối)**
- Xoá mọi literal balance trong `game.ts`: đưa vào `src/data/` (hoặc `src/data/balance.ts`): heal/regen/summon/stun từ `EnemyData.abilities` (`enemies.ts:53-58`), thông số spell từ `SPELLS` (dùng đúng `damage/radius/delay/cooldown/duration`), dmg/HP/attackInterval của lính từ `TowerData`, hệ số sát thương lên lính, ngưỡng sao, hệ số refund, thời gian giữa các wave, bonus gọi wave sớm.
- Bảo đảm: **mọi con số trong code phải có nguồn từ data hoặc từ `balance.ts`**; mọi con số hiển thị trong UI phải tính ra từ chính data đó.
- **DoD:** `grep -nE "(50|65|12|3\.5|0\.8|180|130|2\.5|7 \+ level|9\.0)" src/core/game.ts` không còn hit nào thuộc balance; bảng BALANCE trong docs khớp 100% với hành vi trong game.

**B1. Hệ thống status effect tổng quát**
- Thêm `statuses: StatusEffect[]` vào enemy/soldier/tower: `slow{factor,duration}`, `stun`, `burn{dps,duration}`, `poison`, `weaken{armorShred}`, `mark{bonusDamage}`, `shield`, `regen`, `haste`.
- Stacking rule rõ ràng (cùng loại: lấy mạnh nhất, refresh thời gian), tick theo dt, icon hiển thị trên thanh máu, VFX theo status, âm thanh khi áp dụng/hết.
- **Fix bug**: `slowed/slowFactor` hiện không bao giờ được gán (`game.ts:43-44,1135-1139`) → nối vào hệ thống mới và làm cho frost FX hoạt động thật.
- **DoD:** cast Slow Hex thấy enemy chậm thật, có icon + VFX + số liệu đúng 40%/3s.

**B2. Hiện thực hoá toàn bộ spec đang "rỗng"**
- Sharpshooter: 25% crit ×3 (`towers.ts:49`) với floating text và VFX riêng.
- Slow Hex: slow 40%/3s (`towers.ts:135`).
- Cluster Bombs: 4 mini-nổ (`towers.ts:204`) với falloff.
- Knights: double HP **và** hồi máu theo thời gian (`towers.ts:262`).
- Rangers: dmg cao + attack nhanh hơn thật (`towers.ts:277`), và cho lính spec này hình dáng/đạn khác.
- Thêm **spec effect descriptor trong data** (`specials: [{type:'crit',chance:0.25,mult:3}]`) để không phải hardcode `if (specId === ...)`.
- **DoD:** mỗi spec có ít nhất 1 hiệu ứng cơ chế riêng quan sát được; viết unit test cho từng effect.

**B3. Falling-off splash + splash hợp lý**
- Sát thương giảm dần từ tâm: 100% ở tâm → 40% ở rìa; không cộng dồn vô hạn khi nhiều vụ nổ trùng nhau (giới hạn theo `sourceId` và cooldown 0.1s); hiển thị vòng splash đúng bán kính.
- **DoD:** cannon ở rìa vẫn hữu dụng nhưng không còn mạnh hơn cả đánh trực diện; có test số học.

**B4. Projectile thông minh hơn**
- Re-target sang enemy gần nhất nếu mục tiêu chết (trong bán kính nhỏ) hoặc bay tiếp tới điểm đến rồi mất; đạn phép có homing nhẹ; cannon có đường parabol + dự đoán vị trí (lead) ở level cao.
- **DoD:** không còn đạn "bốc hơi" vô lý khi mục tiêu chết.

**B5. UI chọn targeting priority**
- Mỗi tower có priority người chơi chọn được: First / Last / Strongest / Weakest / Closest; lưu theo tower, hiển thị bằng icon trên panel, có phím tắt hoặc nút cycle.
- **DoD:** đổi priority thấy hành vi bắn đổi ngay, icon khớp.

**B6. Preview tầm bắn & ghost placement**
- Hover build slot → hiện vòng tầm bắn + DPS dự kiến + đánh dấu enemy đang trong tầm; kéo tower từ radial menu có **bóng ma** bám con trỏ, snap vào slot hợp lệ, đỏ khi không hợp lệ; chuột phải/Esc huỷ.
- **DoD:** có thể đặt tower bằng 1 lần kéo; không cần click 2 bước như hiện tại.

**B7. Barracks sâu hơn**
- Rally point phải là **điểm gần nhất trên đoạn path** (không chỉ đỉnh, `game.ts:1226-1234`) và người chơi **kéo cờ rally** để chọn vị trí đứng; lính có 4 trạng thái rõ (march/block/fight/respawn).
- Sửa bug reinforcement hồi sinh vĩnh viễn (`game.ts:1246-1258` vs `1308-1321`); sửa stun không áp dụng cho barracks (`game.ts:986-995`); sát thương enemy→lính lấy từ data thay vì `8% maxHp` (`game.ts:715`).
- **DoD:** kéo cờ → lính đi tới đúng chỗ; reinforcement biến mất sau 16s và không quay lại.

**B8. Spell đúng data + có chiều sâu**
- Dùng `SPELLS` (`spells.ts`), thêm 2 spell mới nếu cần (ví dụ: `Frost Nova` làm chậm diện rộng, `Blessing` buff tầm/ tốc bắn cho tower trong vùng, `Meteor` đơn mục tiêu).
- Có delay trước khi giáng (RoF delay 0.8s) với dấu hiệu cảnh báo trên mặt đất để người chơi/enemy kịp phản ứng; sát thương magic/physic rõ ràng; có falloff.
- **DoD:** xoá mọi literal spell trong `game.ts`; UI hiển thị mô tả lấy từ data.

**B9. Wave preview + thông tin địch**
- Panel nhỏ hiện **3 wave kế tiếp**: loại địch, số lượng, chỉ số chính, biểu tượng cảnh báo (bay/giáp/summon). Thêm nút "enemy intel" mở bestiary (đã có Lore modal, mở rộng nó).
- **DoD:** người chơi biết trước wave sau có gì mà không cần đoán.

**B10. Kinh tế & nhịp độ**
- Rà lại toàn bộ bảng 3.7: đưa DPS/gold của mọi tower về dải 0.08-0.14; nerf/buff spec; cannon cần lợi thế diện rộng rõ; barracks cần chống chịu tốt hơn.
- **Scale enemy HP theo level** (hệ số 1.0 → 1.6) thay vì chỉ tăng số lượng; thêm biến thể elite ở wave cuối.
- Bonus gọi wave sớm: đổi thành `bonus = base × (thời gian_còn_lại / thời_gian_chờ)` để không thành nguồn thu cố định; giới hạn snowball.
- Thêm báo cáo sau trận: vàng kiếm được, sát thương theo từng tower, số mạng mất, thời gian.
- **DoD:** `docs/BALANCE.md` có bảng DPS/gold trước-sau, kèm chứng minh level 5 vẫn thắng được với 3 sao ở Normal.

**B11. Chế độ chơi & độ khó**
- 3 độ khó (Casual / Normal / Veteran): hệ số mạng, vàng, HP/tốc độ địch, yêu cầu sao; lưu riêng theo độ khó.
- **Endless mode** sau wave cuối với modifier tăng dần (đã có field `save.endlessBestWave` chưa dùng, `types.ts:123`).
- **Iron Challenge** mỗi level: luật đặc biệt (không spell / chỉ 1 loại tower / giới hạn slot) + thưởng sao riêng.
- **DoD:** mỗi chế độ vào được từ world map, lưu kết quả, có UI riêng.

**B12. Meta progression bằng sao (kích hoạt `UpgradeNode`)**
- `UpgradeNode` (`types.ts:106-113`) hiện chưa được dùng ở đâu; `save.upgrades` (`types.ts:121`) chưa bao giờ đọc/ghi. Hãy triển khai cây nâng cấp 4 nhánh (Economy / Towers / Spells / Hero) với 12-18 node, mỗi node nhiều cấp, tiêu sao, có respec.
- Thêm **achievements** (12-15 cái) + phần thưởng (vàng khởi đầu, skin, spell).
- **DoD:** tiêu sao đổi được hành vi trong trận (kiểm tra bằng số liệu), save/load đúng, UI cây nâng cấp rõ ràng.

**B13. Enemy mới + boss nhiều pha**
- Thêm 4-6 enemy lấp vai trò còn trống: lính bọc giáp nặng (yêu cầu sát thương phép), bầy nhanh (swarm), địch tầm xa dừng lại bắn lính/tower, địch chia tách khi chết, địch buff đồng minh (aura), địch có khiên phép.
- 3 boss có **2 pha + đòn đánh có telegraph** (viền đỏ + 400ms), sửa bug triệu hồi của Warlord (`game.ts:762-765` spawn trong base), cho boss có intro card + nhạc riêng.
- **DoD:** mỗi enemy mới có sprite/animation/âm thanh riêng, có entry trong bestiary, có test cân bằng.

**B14. HUD thông tin trong trận**
- Bảng chi tiết khi chọn tower: DPS thực, tầm, loại sát thương, tổng vàng đã đầu tư, refund, priority, số kill.
- Hiện `dps` và `coverage` khi hover build slot; đếm kill/in; hiển thị "% wave" rõ hơn.
- **DoD:** không cần đoán bất kỳ con số nào khi chơi.

**B15. Tutorial & onboarding**
- Tutorial theo ngữ cảnh 6-8 bước, có highlight đúng đối tượng + mũi tên + dim nền + "skip"/"đã hiểu"; trạng thái lưu vào save (**hiện `tutorialDismissed` không bao giờ được set true → không tắt được**, `game.ts:479,1944`).
- Thêm tooltip lần đầu cho từng hệ thống (spell, sell, priority, speed), có màn hình "how to play" trong menu.
- **DoD:** người mới chơi level 1 tự hiểu mọi cơ chế chính mà không cần đọc ngoài.

**B16. Save & settings**
- Versioning + migration (`save.ts:18-29` hiện merge nông, không có `version`), lưu: settings (muted, volume, speed mặc định, autostart, reduced motion, ui scale, language), level đang chơi dở, thống kê, achievements, độ khó.
- Sửa bug mute không được lưu; thêm export/import JSON; `clearSave` phải có UI xác nhận.
- **DoD:** tắt tiếng → reload vẫn tắt tiếng; save cũ vẫn load được.

**B17. QoL & điều khiển**
- Thêm speed **3×** (hiện `GameSpeed = 1|2`, `types.ts:117`), hotkey Space/1/2/3, autostart wave toggle, tạm dừng bằng Esc, menu pause đầy đủ (settings, restart, về map) — **hiện pause vẫn cho xây/bán/cast spell, phải chặn**, `game.ts:531-535`.
- Chuột phải/Enter để huỷ, double-click để chọn nhanh, giữ để bán nhanh (có xác nhận), hotkey chọn tower.
- **DoD:** mọi hành động thường dùng đều làm được bằng bàn phím; pause thật sự dừng mọi thao tác.

**B18. Cân bằng theo dữ liệu chơi (telemetry nhẹ, offline)**
- Ghi lại cục bộ: wave thua, tower dùng nhiều nhất, spell dùng, thời gian mỗi level → hiển thị trong menu "Thống kê" để bạn tinh chỉnh.
- Viết **unit test mô phỏng** (vitest + sim headless) cho: kinh tế, đường cong wave, hiệu ứng spec, status effect, splash falloff.
- **DoD:** `npm test` chạy được, ≥20 test, bao phủ các công thức chính; không cần DOM.

**B19. Localization VN/EN**
- Tách mọi chuỗi hiển thị sang `src/data/strings.ts` với `vi`/`en`; toggle trong settings; font hỗ trợ dấu tiếng Việt (Inter có, MedievalSharp thì kiểm tra — nếu thiếu dấu thì dùng font dự phòng cho tiếng Việt).
- **DoD:** chuyển ngôn ngữ đổi ngay toàn bộ UI, không còn chuỗi hardcode trong renderer/game.

---

## 7. WORKSTREAM C — ÂM THANH & UX

1. **Rate-limit âm thanh**: hiện mỗi phát bắn gọi `playSound` (`game.ts:1056-1062`), ở 2×/3× speed + Rapid Volley (3 đạn) có thể có hàng chục nguồn cùng lúc → thêm voice cap (tối đa 8 SFX đồng thời/loại) + random pitch ±8% để không bị "máy".
2. **Âm thanh theo khoảng cách/không gian**: giảm âm lượng theo khoảng cách từ con trỏ tới sự kiện (giả lập positional), ưu tiên sự kiện gần.
3. **Nhạc**: thay `setInterval` trôi nhịp (`audio.ts:557`) bằng scheduler dựa trên `audioCtx.currentTime` (lookahead 100ms); 3 track (menu / battle / boss), có crossfade 1.5s, dừng hẳn khi pause hoặc mute.
4. **Âm thanh UI mới**: hover, press, cancel, invalid, tooltip, level-up, achievement, coin, wave warning, boss intro.
5. **Settings âm thanh**: master/music/sfx volume riêng, lưu vào save.
6. **UX flow**: chuyển cảnh, back luôn hoạt động, Esc luôn là "quay lại/huỷ", không có màn hình chết (mọi màn hình phải có đường thoát).
7. **Chuẩn phản hồi**: mỗi thao tác phải có phản hồi trong ≤100ms (hình ảnh + âm thanh); mỗi hành động tốn ≤3 click.

---

## 8. WORKSTREAM D — KỸ THUẬT & DỌN DẸP

1. **Xử lý code 3D chết** (quyết định đã chốt: KHÔNG migrate sang WebGL): xoá các hàm 3D trong `MapRenderer` (`:509,815,904`), `TowerRenderer` (`:20-80`), `EnemyRenderer` (`:41-246`), `ProjectileRenderer` (`:42-268`), xoá `ThreeRenderer.ts`, gỡ `three` khỏi `package.json` dependencies, gỡ `@types/three`; thay 2 helper `lighten/darken` bằng `src/core/color.ts` (giữ đúng hành vi). Nếu bạn thấy rủi ro, có thể giữ file nhưng **không được để nó nằm trong đường chạy** và phải ghi rõ trong docs.
2. **Gỡ dependency rác**: `@tweenjs/tween.js`, `@dimforge/rapier3d-compat`, `meshoptimizer`, `fflate`, `@types/stats.js`, `@types/webxr` (đang nằm trong `package-lock`/`node_modules` nhưng không dùng) — chỉ gỡ nếu `npm run build` vẫn pass.
3. **Tách `game.ts`**: mục tiêu ≤600 dòng/file. Đề xuất: `core/Game.ts` (loop + screen state), `systems/WaveSystem.ts`, `systems/EnemySystem.ts`, `systems/TowerSystem.ts`, `systems/SoldierSystem.ts`, `systems/SpellSystem.ts`, `systems/StatusSystem.ts`, `systems/VFXSystem.ts`, `render/LevelRenderer.ts`, `ui/LevelUI.ts` (hit-test tách khỏi draw), `core/Balance.ts`. **Không refactor lớn trong cùng commit với thay đổi tính năng** — tách thành 2 commit.
4. **Sửa cap pool**: thêm giới hạn cứng + `releaseOldest()` (`pool.ts`), thay `indexOf` O(n) bằng `swap-remove` + index map nếu cần.
5. **Test & CI**: thêm `vitest`, script `test`, `typecheck`; viết test cho sim thuần (không DOM) như B18.
6. **Bật `noUnusedLocals: true`** và dọn import chết (`game.ts:14` `angle/normalize`, `darkenColor` `game.ts:2348`, `SPELLS` import thừa, `clearSave` không dùng, `ads.ts` không dùng — hoặc xoá hoặc dùng thật).
7. **Không dùng `any`**, không `@ts-ignore`; mọi hàm public có JSDoc ngắn; comment tiếng Anh, thuật ngữ nhất quán.

---

## 9. LỘ TRÌNH 4 PHASE (thực thi tuần tự, mỗi phase 1 nhánh/commit riêng)

**Phase 0 — Nền móng (bắt buộc, không làm đẹp gì ở phase này)**
A0, A1, A18, B0, D1 (một phần), D4, D6, sửa 7 bug ở 3.6, viết `docs/AUDIT.md` + `docs/ROADMAP.md`.
*Điều kiện ra phase:* `npm run build` pass; hình không méo ở mọi tỷ lệ; pause chặn được xây/bán/cast; không còn literal balance trong `game.ts`.

**Phase 1 — Đồ họa lõi**
A2, A3, A4, A5, A6, A8, A9, A10, A11, A13, A15, A17.
*Điều kiện ra phase:* 60fps với 80 enemy trên máy tầm trung; 0 emoji; có số liệu trước/sau trong báo cáo.

**Phase 2 — Chiều sâu gameplay**
B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B14, B15, B17, B18.
*Điều kiện ra phase:* mọi spec có hiệu ứng thật + test; bảng cân bằng mới có chứng minh; không bug nào trong 3.6 còn tồn tại.

**Phase 3 — Meta & nội dung**
A7, A12, A14, A16, B11, B12, B13, B16, B19, C1-C5, D2, D3, D5, D7.
*Điều kiện ra phase:* có ít nhất 1 chế độ chơi lại, cây nâng cấp hoạt động, 2 ngôn ngữ, weather, achievements.

---

## 10. QUY TẮC LÀM VIỆC & ĐỊNH DẠNG ĐẦU RA

1. **Khảo sát trước, code sau.** Bước đầu tiên của bạn là đọc hết các file ở mục 2.2 và viết `docs/AUDIT.md` xác nhận/bổ sung chẩn đoán ở mục 3 (nếu bạn tìm thấy điều mục 3 nói sai, hãy nói thẳng và trích `file:line`).
2. **Kế hoạch trước khi sửa**: viết `docs/ROADMAP.md` chia task theo phase, mỗi task có DoD; chỉ bắt đầu code sau khi kế hoạch tồn tại trong repo.
3. **Mỗi phase = nhiều commit nhỏ**, thông điệp dạng `feat(gfx): sprite bank + atlas cache` / `fix(sim): reinforcement lifespan revive bug` / `refactor(core): extract WaveSystem`. Không trộn refactor với tính năng.
4. **Sau mỗi commit**: `npm run build` phải pass; nếu có test thì `npm test` phải pass. Nếu build đỏ, sửa trước khi làm việc khác.
5. **Đo lường**: mỗi thay đổi hình ảnh/hiệu năng phải kèm số liệu (fps, frame time, số lệnh vẽ, kích thước cache) và ảnh chụp màn hình nếu có thể.
6. **Không được phá vỡ**: API công khai của `Renderer`, `InputManager`, `Game`; hành vi save cũ; cấu trúc `data/*.ts` (chỉ mở rộng thêm field, không đổi field cũ nếu không migrate).
7. **Khi bế tắc hoặc spec mâu thuẫn**: dừng lại, viết câu hỏi cụ thể kèm `file:line` và 2-3 phương án, rồi chờ. Không tự ý mở rộng phạm vi.
8. **Báo cáo cuối mỗi phase** theo mẫu: (a) việc đã làm + `file:line`; (b) số liệu trước/sau; (c) rủi ro còn lại; (d) việc đề xuất tiếp theo.
9. **Ngôn ngữ**: trao đổi tiếng Việt; code/comment/biến/commit tiếng Anh; tài liệu trong `docs/` viết tiếng Việt.

---

## 11. CHECKLIST NGHIỆM THU (Definition of Done)

**Hình ảnh**
- [ ] Không méo hình ở 4:3 / 16:9 / 21:9 / điện thoại dọc; HUD nằm trong safe area.
- [ ] Có y-sorting đúng: enemy phía sau bị tower che.
- [ ] Một nguồn sáng duy nhất; mọi entity/prop/tower có contact shadow + cast shadow.
- [ ] Mỗi enemy/tower/prop có animation (idle + hành động + chết), không có entity nào biến mất tức thì.
- [ ] Có VFX riêng cho: bắn, trúng, nổ, phép, băng, lửa, triệu hồi, nâng cấp, bán, chết, boss.
- [ ] Không còn emoji trong game; mọi icon là vector bake.
- [ ] Mọi nút có hover/press/disabled; mọi màn hình chuyển cảnh có animation.
- [ ] 5 level khác nhau rõ rệt về không khí (palette + weather + ambient particle).
- [ ] Không còn chữ < 12px.

**Gameplay**
- [ ] Mọi con số đến từ `data/` hoặc `balance.ts`; UI hiển thị khớp data.
- [ ] 8/8 spec có hiệu ứng cơ chế thật + unit test.
- [ ] Có hệ thống status effect (slow/stun/burn/…) hoạt động và hiển thị.
- [ ] Splash có falloff; projectile re-target; barracks rally theo đoạn path + cờ rally.
- [ ] Có wave preview, có chọn targeting priority, có ghost placement.
- [ ] Pause chặn mọi thao tác; có speed 3×; có autostart toggle.
- [ ] Có ít nhất 1 chế độ chơi lại (endless hoặc iron) + 3 độ khó.
- [ ] Cây nâng cấp bằng sao hoạt động, save/load đúng.
- [ ] Bug 3.6 (a)-(g) đã sửa và có test hồi quy.
- [ ] `docs/BALANCE.md` chứng minh level 5 thắng được 3 sao ở Normal.

**Kỹ thuật**
- [ ] `npm run build` pass; `npm test` pass với ≥20 test.
- [ ] Không còn `three` trong bundle; `dist` nhỏ hơn trước.
- [ ] `game.ts` ≤ 600 dòng, các hệ thống đã tách file.
- [ ] 60fps (p95 frame ≤ 12ms) với ≥80 enemy + ≥400 particle trên máy tầm trung.
- [ ] Không rò rỉ sprite cache sau 10 phút chơi.
- [ ] Không có `any`, không `@ts-ignore`, không import chết.

---

## 12. ANTI-GOALS — NHỮNG VIỆC KHÔNG ĐƯỢC LÀM

1. **Không** migrate renderer sang WebGL/Three.js trong đợt này; không thêm renderer thứ hai. Chỉ Canvas 2D + offscreen canvas.
2. **Không** thêm asset nhị phân (ảnh/âm thanh tải về) cần license; mọi thứ sinh bằng code hoặc do bạn tự vẽ bằng code.
3. **Không** thêm backend/network/analytics ngoài; telemetry chỉ ghi localStorage.
4. **Không** đổi design space, không đổi `FIXED_DT`, không đổi công thức damage cơ bản mà không có test + ghi chú.
5. **Không** phá save cũ: mọi thay đổi schema phải có migration.
6. **Không** refactor toàn bộ `game.ts` trong cùng commit với tính năng; không viết lại file renderer từ đầu khi chỉ cần sửa.
7. **Không** dùng emoji làm icon, không dùng font hệ thống cho tiêu đề, không dùng `alert/prompt/confirm` của trình duyệt.
8. **Không** thêm thư viện nặng mới (physics engine, UI framework, animation engine) — nếu cần, phải giải trình trong docs và chứng minh bundle không tăng quá 50KB gzip.
9. **Không** "cải thiện" bằng cách tăng số lượng particle/shake vô tội vạ làm mất khả năng đọc trận đấu; ưu tiên rõ ràng (readability) hơn hào nhoáng.
10. **Không** bịa số liệu trong báo cáo; nếu chưa đo được, ghi rõ "chưa đo".

---

## 13. BẢN PROMPT RÚT GỌN (nếu cần dùng nhanh)

> Bạn là lead game dev + technical artist cho game tower-defense 2D **Last Bastion** tại `D:\hoc\GITHUB\Last Bastion` (TypeScript + Vite + Canvas 2D, design space 1280×720, fixed timestep 1/60, không có asset ngoài — mọi thứ vẽ bằng code). Nhiệm vụ: nâng cấp **đồ họa** lên chuẩn Kingdom Rush và làm **gameplay** có chiều sâu, **trên nền kiến trúc hiện có, không viết lại từ đầu, không migrate sang WebGL**.
> Trước khi code: đọc hết `src/core/*.ts`, `src/data/*.ts`, `src/rendering/*.ts`, `index.html`, `package.json`; viết `docs/AUDIT.md` (xác nhận các lỗi đã biết: không letterbox nên hình méo `core/renderer.ts:33-48`; render không nội suy `game.ts:276`; pause vẫn cho xây/bán/cast spell `game.ts:531-535`; `slowed` không bao giờ được gán nên slow/frost không tồn tại `game.ts:1135-1139`; 6/8 spec không có hiệu ứng thật; thông số trong `data/spells.ts`, `enemies.ts.abilities`, `towers.ts` bị hardcode lại trong `game.ts`; `ThreeRenderer.ts` và toàn bộ nhánh 3D là code chết), rồi viết `docs/ROADMAP.md` chia 4 phase.
> **Đồ họa:** thêm `viewport.ts` (letterbox + safe area), nội suy render, **SpriteBank** bake sprite vào offscreen canvas + cache LRU, **y-sorting** theo `y+elevation`, hệ thống **ánh sáng/bóng thống nhất** (nắng trên-trái, contact + cast shadow), terrain 3 lớp parallax + biome + decal, props và ambient particle sống, **weather/day-night**, tower có state machine `idle/aim/fire/recoil/build/upgrade/damaged` + turret xoay + muzzle flash, enemy có walk/attack/hit/death/spawn animation + biến thể elite, projectile có trail/xoay/parabol/cluster, **thư viện VFX** (explosion, frost, fire, lightning, shockwave, smoke, decal, coinPop…), screen shake + hit-stop + camera punch, post-FX 2D (glow additive, color grade, fog, vignette, grain), HUD juice (số vàng tween, đồng xu bay về HUD, so sánh chỉ số khi nâng cấp, tooltip), thay **toàn bộ emoji bằng icon vector bake**, accessibility (UI scale, colorblind, reduced motion), loading bake thật, overlay debug F1. Ngân sách: 60fps với ≥80 enemy + ≥400 particle, p95 ≤12ms, particle cap 600, mọi lớp tĩnh phải bake.
> **Gameplay:** data-drive toàn bộ (xoá literal balance), hệ thống **status effect** tổng quát (slow/stun/burn/poison/mark/shield/regen) và hiện thực đủ 8 spec (crit, slow hex, cluster, knights HoT, rangers…), splash có **falloff** 100%→40%, projectile **re-target**, barracks rally theo **đoạn path** + cờ rally kéo được, spell dùng đúng `SPELLS` + thêm spell mới, **wave preview** + bestiary, **chọn targeting priority**, **ghost placement** kéo thả, 3 độ khó + **endless** + iron challenge, **cây nâng cấp bằng sao** (dùng `UpgradeNode` đang bỏ không), achievements, 4-6 enemy mới + 3 boss 2 pha có telegraph, 4-6 spell, UI thông tin đầy đủ, tutorial 8 bước lưu được trạng thái, speed 3×, pause đúng nghĩa, save có versioning + settings (mute/volume/ngôn ngữ VN-EN), vitest ≥20 test cho công thức, tách `game.ts` thành các system ≤600 dòng.
> **Quy tắc:** mỗi phase nhiều commit nhỏ, `npm run build` luôn pass, không `any`/`@ts-ignore`, không thêm thư viện nặng, không phá save cũ, không bịa số liệu; báo cáo mỗi phase kèm `file:line` + số liệu trước/sau; gặp mâu thuẫn thì hỏi lại kèm 2-3 phương án.
> **Xong khi:** hình không méo ở mọi tỷ lệ, không còn emoji, mọi entity có animation + bóng đúng, mọi con số lấy từ data, 8/8 spec hoạt động thật có test, có chế độ chơi lại + cây nâng cấp + 2 ngôn ngữ, và `docs/BALANCE.md` chứng minh level 5 thắng được 3 sao ở Normal.
