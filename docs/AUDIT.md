# AUDIT — Last Bastion (trước Phase 0)

Tài liệu này ghi lại hiện trạng đã **kiểm chứng bằng code** (không suy đoán) tại thời điểm bắt đầu nâng cấp.
Mọi tham chiếu dạng `file:line` đều trỏ tới code tại commit baseline `32575b1`.

- Stack: TypeScript ~5.7, Vite ^6, `three` (dead dependency — đã gỡ ở Phase 0).
- Không có test runner, không có linter, không có CI (`package.json:6-10`).
- Không có thư mục `public/`, không có asset ảnh/âm thanh: 100% đồ họa vẽ bằng code, 100% âm thanh là WebAudio tổng hợp.
- Design space cố định 1280×720, `FIXED_DT = 1/60` (`src/data/types.ts:130-133`).

## 1. Vòng lặp / trạng thái

| # | Phát hiện | Bằng chứng |
|---|---|---|
| 1 | Không letterbox: `setTransform` dùng 2 scale khác nhau cho X/Y → hình méo ở mọi tỷ lệ ≠ 16:9; hit radius trở nên không đối xứng | `src/core/renderer.ts:33-48`, `src/core/input.ts:34-42` |
| 2 | Render không nội suy → giật trên màn 120/144 Hz | `src/core/game.ts:265-279` |
| 3 | `consumeClick()` chạy sau render, `handleLevelInput()` chạy mỗi fixed step → một sự kiện có thể bị xử lý nhiều lần trong 1 frame | `src/core/game.ts:277`, `src/core/game.ts:1510-1528` |
| 4 | Pause chỉ chặn sim, **không chặn** xây/nâng cấp/bán/cast spell; dòng "Click anywhere to resume" là sai | `src/core/game.ts:531-535`, `:1953` |
| 5 | Mute không được lưu vào save | `src/core/audio.ts:5,26-43`, `src/data/types.ts:124-126` |

## 2. Đồ họa

**Đang có:** 5 bộ theme màu theo level (`src/rendering/MapRenderer.ts:64-150`); terrain + path pre-render vào canvas offscreen (`MapRenderer.ts:1038-1111`); 8 loại prop vẽ tay; tower 4 loại × 3 level × 2 spec (`TowerRenderer.ts:83-798`); enemy 7 loại vẽ tay + health bar + frost overlay (`EnemyRenderer.ts:995-1150`); title screen, world map parchment, HUD gỗ (`UIRenderer.ts`).

**Thiếu / lỗi:**

| # | Phát hiện | Bằng chứng |
|---|---|---|
| 1 | Không có pipeline sprite/atlas: mọi entity vẽ lại bằng path mỗi frame | `EnemyRenderer.ts:995`, `TowerRenderer.ts:905` |
| 2 | Sai thứ tự vẽ, không có y-sorting (enemy luôn đè tower/props) | `src/core/game.ts:1849-1896` |
| 3 | Ánh sáng/bóng không thống nhất: mỗi nơi tự vẽ ellipse với alpha/offset khác nhau | `TowerRenderer.ts:923`, `EnemyRenderer.ts:1017-1028` |
| 4 | Không post-processing (chỉ vignette); screen shake chỉ tồn tại trong code 3D chết | `src/core/renderer.ts:100-110`, `ThreeRenderer.ts:150-153` |
| 5 | VFX nghèo: particle chỉ là hình tròn 2-5px; **không tồn tại renderer cho vụ nổ/va chạm**; không death animation | `game.ts:1168-1183,1908-1917,1121-1125`, `EnemyRenderer.ts:1000` |
| 6 | Tower không thể xoay/ngắm: `TowerRenderData` không có field góc; feedback bắn chỉ là scale pop ~6% | `TowerRenderer.ts:9-18,915` |
| 7 | Icon là emoji/ký tự text (kể cả `⚡` cho stun, `+` cho build slot, `▶ ❚❚` cho pause/speed) | `UIRenderer.ts:1697`, `TowerRenderer.ts:946,956`, `game.ts:1990-1999` |
| 8 | UI tĩnh: hover chỉ đổi màu, không press state/transition/modal animation | `renderer.ts:143-183`, `UIRenderer.ts:1508-1582` |
| 9 | Chỉ 2/8 loại prop được dùng; mọi cây luôn `variant 0` | `game.ts:519-524`, `renderer.ts:91` |
| 10 | Nền bị banding chéo do cỏ/hoa đặt theo lưới số học; màu hoa hardcode bỏ qua `theme.flowerColors` | `MapRenderer.ts:1083-1106` |
| 11 | `waterColor/skyGradient/ambientLight/fogColor/fogDensity` khai báo nhưng **không dùng** → 5 level chỉ khác màu cỏ | `MapRenderer.ts:53-57` |
| 12 | Gate/Castle không nhận theme; "golden lion emblem" thực chất là hình chữ nhật vàng | `MapRenderer.ts:1202,1271,1336-1337` |
| 13 | Frost FX là trang trí chết vì `enemy.slowed` không bao giờ được gán | `EnemyRenderer.ts:969-991`, `game.ts:1135-1139` |
| 14 | Loading screen giả (progress random) | `src/main.ts:16-50` |

## 3. Gameplay

| # | Phát hiện | Bằng chứng |
|---|---|---|
| 1 | `slowed`/`slowFactor` không bao giờ được gán → không tồn tại slow | `game.ts:43-44,1135-1139` |
| 2 | 6/8 spec không có hiệu ứng cơ chế (chỉ `rapid_volley` được check) | `game.ts:1065`; `towers.ts:49,135,204,262,277` |
| 3 | Splash áp full damage cho mọi enemy trong bán kính, không falloff, cộng dồn khi nhiều vụ nổ trùng | `game.ts:1116-1124,1401` |
| 4 | Projectile mất target thì biến mất, không re-target | `game.ts:1097-1102` |
| 5 | Rally point = **đỉnh path gần nhất**, không phải điểm gần nhất trên đoạn | `game.ts:1226-1234` |
| 6 | Lính reinforcement hết `lifespan` vẫn được hồi sinh vĩnh viễn sau 10s | `game.ts:1246-1258` vs `1308-1321,1459` |
| 7 | Stun không áp dụng cho barracks | `game.ts:986-995` |
| 8 | Enemy bay không bao giờ `facingLeft` (chỉ set trong nhánh path bộ) | `game.ts:824` |
| 9 | Triệu hồi của Warlord teleport goblin vào giữa base | `game.ts:762-765` |
| 10 | `tutorialDismissed` không bao giờ được set `true` → tutorial không tắt được | `game.ts:479,1944` |
| 11 | `timeBetweenWaves` gán 15 rồi bị ghi đè 5 ở level start | `game.ts:460,484` |
| 12 | `UpgradeNode` (`types.ts:106-113`) chưa từng được tham chiếu; `save.upgrades`, `save.endlessBestWave` chưa từng đọc/ghi | `types.ts:121-123` |
| 13 | Không có: hero, tower active ability, chọn priority, wave preview, endless, difficulty, achievements, speed 3×, autostart toggle, accessibility | — |
| 14 | Pool không có cap; `release()` dùng `indexOf` O(n); pool text 40 entry bị bỏ im lặng khi quá tải | `pool.ts:19,24-31`, `game.ts:241-245` |

### 3.1 Dữ liệu vs code lệch nhau (nguồn sự thật bị phá vỡ)

| Hạng mục | Data | Code | Hệ quả |
|---|---|---|---|
| Shaman heal | 5 HP/3s, r=80 (`enemies.ts:56`) | +12 HP/3.5s (`game.ts:733-744`) | mạnh hơn ~2.4× |
| Troll regen | 4 HP/1s (`enemies.ts:85`) | +5 HP/1s (`game.ts:745-751`) | +25% |
| Warlord | 3 goblin/10s; stun r=120/2s/8s (`enemies.ts:101-102`) | 2 goblin/9s; stun r=130/2.5s/9s (`game.ts:752-777`) | lệch hoàn toàn |
| Rain of Fire | 80 dmg, r=80, delay 0.8 (`spells.ts:8-11`) | 50 dmg, r=65 (`game.ts:1412,1429-1430`) | `SPELLS` không được dùng |
| Reinforcements | cd 20, duration 15 (`spells.ts:18-19`) | 60 HP, lifespan 16 (`game.ts:1436,1449-1459`) | lệch |
| Barracks lính | dmg 5/10/18, fireRate 1.0/1.1/1.2 (`towers.ts:227-254`) | dmg `7+level*5`, interval 0.8 cố định (`game.ts:1243,1283`) | lệch |
| Enemy đánh lính | — | `max(5, 8% maxHp)` (`game.ts:715`) | Warlord đánh 64 dmg/lính 180 HP |

### 3.2 Cân bằng tại baseline (DPS = damage × fireRate)

| Tower | DPS L1/L2/L3 | Chi phí tới L3 | DPS/gold |
|---|---|---|---|
| Archer | 9.6 / 19.6 / 35.2 | 340 | 0.104 |
| Mage | 10.8 / 25.2 / 44.8 | 500 | 0.090 |
| Cannon | 10 / 22 / 39 | 595 | 0.066 |
| Barracks (2 lính) | 8.75 / 15 / 21.25 | 340 | 0.063 |
| Rapid Volley | 90 | 570 | **0.158** |
| Sharpshooter | 36 (chưa có crit) | 570 | 0.063 |
| Arcane Blast | 54 | 800 | 0.068 |
| Heavy Bombard | 40 | 945 | 0.042 |
| Cluster Bombs | 27.5 | 945 | 0.029 |
| Knights | 27.5 | 570 | 0.048 |
| Rangers | 43.75 (đang = barracks) | 570 | 0.077 |

Nguồn: `towers.ts` + công thức tại `game.ts:1009`.

## 4. Nợ kỹ thuật

1. `game.ts` là god object 2365 dòng: sim + hit-test UI + render + literal balance trộn lẫn.
2. Code 3D chết ở 5 file rendering + `ThreeRenderer.ts` (305 dòng) + dependency `three` → bundle phình.
3. `EnemyRenderer.renderEnemy` (code chết) bake texture mới theo từng nấc HP → rò rỉ cache nếu bật lại.
4. Không có test/CI; `noUnusedLocals: false` che import chết (`game.ts:14`).
5. Interface enemy/soldier bị định nghĩa trùng (`EnemyRenderer.ts:9-37` vs `game.ts:25-68`).
6. `Tower.animTimer` chỉ là 1 scalar — không đủ cho animation state machine.

## 5. Việc Phase 0 giải quyết

A0, A1, A18, B0, D1 (xoá code 3D chết), D4, D6, và 7 bug ở mục 3 (#6, #7, #8, #9, #10, #11 và #3 ở mức chống cộng dồn).
Các mục còn lại được theo dõi trong `docs/ROADMAP.md`.
