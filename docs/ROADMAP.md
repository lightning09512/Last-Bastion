# ROADMAP — Last Bastion 2.0

Lộ trình 4 phase theo prompt `PROMPT_NANG_CAP_DO_HOA_VA_GAMEPLAY.md`.
Quy tắc: mỗi task có DoD rõ ràng; `npm run build` phải pass sau mỗi nhóm thay đổi; không trộn refactor với tính năng trong cùng commit.

## Phase 0 — Nền móng ✅ HOÀN THÀNH

| Task | Nội dung | DoD | Trạng thái |
|---|---|---|---|
| D0 | `git init` + commit baseline để có thể rollback | có commit gốc | ✅ `32575b1` |
| T0.1 | `docs/AUDIT.md` | ghi lại hiện trạng kèm `file:line` | ✅ |
| T0.2 | `docs/ROADMAP.md`, `docs/BALANCE.md` | tồn tại trong repo | ✅ |
| A0 | `src/core/viewport.ts`: letterbox đúng tỷ lệ + safe area + `screenToWorld`; sửa `renderer.ts` + `input.ts` dùng chung | không méo ở 4:3/16:9/21:9/dọc; click đúng ở mọi tỷ lệ | ✅ |
| A1 | Nội suy render (`prev/curr` + alpha, không cấp phát mỗi frame) | mượt trên màn 144Hz | ✅ |
| A18 | Debug overlay F1 + hook `?debug=1` và `?level=<id>` | bật/tắt được, số liệu dùng cho báo cáo | ✅ |
| B0 | `src/data/balance.ts` + dùng `SPELLS`, `ENEMIES.abilities`, `TowerData.soldier`; xoá literal balance trong `game.ts` | không còn literal balance trong `game.ts` | ✅ |
| Bugfix | 3.6(a) reinforcement hồi sinh, (b) flying facing, (c) barracks stun, (d) projectile re-target, (e) splash falloff + chống cộng dồn, (f) tutorial dismiss, (g) `timeBetweenWaves` | mỗi bug có fix + ghi chú; smoke test xác nhận | ✅ |
| D1 | Xoá code 3D chết + gỡ `three` | `grep -rn "THREE\|ThreeRenderer" src/` = 0; bundle 645→140 kB | ✅ |
| D4 | Cap pool + `releaseOldest` + swap-remove O(1) | không bỏ im lặng text; không phình vô hạn | ✅ |
| D6 | Bật `noUnusedLocals`, dọn import chết + wire 5 loại prop | `tsc` pass với `noUnusedLocals: true` | ✅ |
| Bonus | Wire 5 loại prop đang chết (bush/mushroom/stump/bones/sign) + variant ngẫu nhiên | rừng có 7 loại prop thay vì 2 | ✅ |
| Bonus | Sửa 2 phát hiện ngoài danh sách: mute không lưu, input bị xử lý lặp trong 1 frame | có test trong smoke | ✅ |

### Kết quả đo Phase 0 (đo thật, không ước lượng)

| Chỉ số | Trước | Sau | Cách đo |
|---|---|---|---|
| Bundle `dist/assets/index-*.js` | 645.63 kB (gzip 164.02) | **140.27 kB (gzip 37.95)** | `npm run build` |
| `tsc --noEmit` với `noUnusedLocals: true` | — | **0 lỗi** | `npx tsc --noEmit` |
| Code 3D chết trong `src/` | 6 file, ~1.500 dòng | **0** | `grep -rn "THREE\|ThreeRenderer" src/` |
| Số bước mô phỏng chạy được | — | **72.000 bước / 5 level**, tới wave cuối mọi level, 727 enemy được spawn | `node tools/smoke.mjs` |
| Chi phí mô phỏng (Node, canvas stub) | — | **0,065 ms/bước** | smoke harness |
| Assertion chức năng | — | **19/19 PASS** | smoke harness |
| fps trong Chrome headless (81 enemy + 35 prop) | — | **59,88 fps, p50 16,70 ms, p95 16,80 ms** | CDP + overlay F1 |
| Chi phí CPU mỗi frame (đo đồng bộ, 81 enemy) | — | update **0,108 ms** / render **10,44 ms** | probe CDP |
| Chi phí render khi không có enemy / không có prop | — | 6,05 ms / 4,48 ms | probe CDP |

**Cảnh báo trung thực về số đo:** các số fps/render ở trên lấy từ Chrome headless với rasterizer phần mềm (SwiftShader), **không** đại diện cho máy người dùng có GPU. Chúng dùng để so sánh tương đối và chống hồi quy, không phải lời hứa về fps. Các đỉnh 120–520 ms xuất hiện cả khi cảnh trống → do môi trường headless + GC, không do entity. Kết luận định lượng được: **render là nút cổ chai (10,44 ms), không phải mô phỏng (0,108 ms)** — đúng như thứ tự ưu tiên A2 (SpriteBank) và A5 (bake lớp tĩnh) ở Phase 1.

### Hook QA đã thêm

| Hook | Tác dụng |
|---|---|
| `?debug=1` | bật overlay F1 và expose `window.__lastBastion` |
| `?level=<id>` | vào thẳng một level, bỏ qua menu |
| `game.getQaSnapshot()` | trả fps/p50/p95 + số entity/particle/projectile |
| `node tools/smoke.mjs` | chạy toàn bộ sim + render đường Canvas2D headless, 19 assertion |
| `node tools/browserCheck.mjs <url> <giây> <ảnh> [setup] [probe]` | đo thật trong Chrome qua CDP, chụp ảnh |

**Điều kiện ra Phase 0:** ✅ đã đạt (build pass, hình không méo ở 3 tỷ lệ, pause chặn xây/bán/cast, `game.ts` không còn literal balance, 7 bug đã sửa và có test).

## Phase 1 — Đồ họa lõi

| Task | Nội dung | Phụ thuộc |
|---|---|---|
| A2 | `SpriteBank` + cache LRU, chuyển enemy/tower/slot sang `drawImage` | A0 |
| A3 | Y-sorting theo `y + elevation` | A2 |
| A4 | `Lighting.ts`: contact shadow + cast shadow + rim light thống nhất | A2 |
| A5 | Terrain đa lớp, biome, decal, hết banding, dùng `flowerColors`/`waterColor`/`fogColor`; gate/castle nhận theme | A3 |
| A6 | Props sống + ambient particle theo theme | A5 |
| A8 | Tower state machine `idle/aim/fire/recoil/build/upgrade/damaged`, turret xoay, muzzle flash | A2 |
| A9 | Enemy walk/attack/hit/death/spawn animation + biến thể elite | A2 |
| A10 | Projectile xoay/trail/parabol/cluster + decal mũi tên | A2 |
| A11 | `VFX.ts` + screen shake + hit-stop | A2 |
| A13 | HUD juice: vàng tween, coin bay, so sánh chỉ số, tooltip | A2 |
| A15 | `Icons.ts` thay toàn bộ emoji/ký tự text | A2 |
| A17 | Loading bake thật + loader atlas | A2 |

**Điều kiện ra Phase 1:** 60fps với ≥80 enemy; 0 emoji; có số liệu trước/sau.

## Phase 2 — Chiều sâu gameplay

B1 status effect · B2 hiện thực 8 spec · B3 splash falloff · B4 projectile thông minh (homing/lead) · B5 chọn priority · B6 ghost placement + preview tầm · B7 barracks sâu hơn (rally theo đoạn, cờ rally) · B8 spell theo data + spell mới · B9 wave preview + bestiary · B10 cân bằng + scale HP theo level · B14 HUD thông tin · B15 tutorial 8 bước · B17 speed 3×/pause/menu pause · B18 vitest ≥20 test.

**Điều kiện ra Phase 2:** mọi spec có hiệu ứng thật + test; `docs/BALANCE.md` chứng minh level 5 thắng 3 sao ở Normal; bug 3.6 đã đóng.

## Phase 3 — Meta & nội dung

A7 weather/day-night · A12 post-FX + camera juice · A14 title/world map/chuyển cảnh · A16 accessibility · B11 3 độ khó + endless + iron challenge · B12 cây nâng cấp bằng sao + achievements · B13 enemy mới + 3 boss 2 pha · B16 save versioning + settings · B19 localization VN/EN · C1-C5 âm thanh/UX · D2 gỡ dependency rác · D3 tách `game.ts` ≤600 dòng/file · D5 CI · D7 chuẩn code.

## Rủi ro & quyết định đã chốt

- **Không** migrate sang WebGL/Three.js; chỉ Canvas 2D + offscreen canvas.
- Refactor tách `game.ts` (D3) để Phase 3 và làm sau khi tính năng đã ổn định, tránh xung đột merge.
- Mọi thay đổi schema save phải có migration; Phase 0 chỉ **thêm** field `tutorialDismissed` với default (merge nông của `save.ts` xử lý được save cũ).
- Số liệu hiệu năng lấy từ overlay F1 (A18) và `tools/browserCheck.mjs`, ghi vào báo cáo cuối mỗi phase.
- `pointToSegDist` trong `MapRenderer` đã bị xoá cùng code 3D vì không còn ai gọi; **B7 (Phase 2) sẽ thêm lại helper khoảng cách-đoạn** khi làm rally point trên đoạn path.

## Ghi chú phạm vi Phase 0

- Nội suy chỉ áp cho enemy/soldier/projectile/meteor (tower và prop tĩnh không cần).
- Safe area hiện chỉ mang tính dự phòng: letterbox luôn giữ trọn 1280×720 trong khung nhìn nên HUD không thể bị cắt (đã xác nhận bằng ảnh ở 900×900).
- Rally point của barracks vẫn theo **đỉnh path gần nhất** — cố ý để lại cho B7 (Phase 2) cùng cờ rally kéo được.
- Slow/status effect và hồi máu của Knights vẫn ở Phase 2 (B1/B2); Phase 0 chỉ đưa chỉ số của Rangers/Knights về đúng data.
