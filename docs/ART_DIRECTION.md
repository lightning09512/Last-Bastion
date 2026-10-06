# ART DIRECTION — Last Bastion 2.0

Mục tiêu: đạt chất lượng **"Kingdom Rush-inspired"** trong khi toàn bộ hình ảnh vẫn do code vẽ (không có asset ảnh).

## 0. Giới hạn thực tế (đọc trước)

Kingdom Rush đẹp vì có **sprite hand-painted do hoạ sĩ vẽ**; engine chỉ `drawImage`. Repo này không có asset, nên trần chất lượng là "procedural painterly 2.5D": có thể đạt outline/khối/bóng/animation/VFX chỉn chu, **không thể** đạt độ chi tiết nét cọ của tranh vẽ tay. Muốn vượt trần đó phải bổ sung pipeline ảnh (`loadAtlas` trong A17) và art do người vẽ.

## 1. Ánh sáng — một mặt trời duy nhất

Nắng cố định ở **trên-trái**. Mọi renderer phải lấy từ `src/rendering/Lighting.ts`:

| Quy tắc | Hằng số / hàm |
|---|---|
| Hướng tới mặt trời | `SUN_DIR = (-0.56, -0.83)` |
| Hướng bóng đổ | `SHADOW_DIR = (0.56, 0.83)` |
| Highlight | nằm ở cạnh trên-trái của mọi khối |
| Bóng sát chân | `contactShadow(ctx, x, y, rx, ry, 0.34)` |
| Bóng đổ xa | `castShadow(ctx, x, y, rx, ry, elevation, 0.18)` |
| Tối chân công trình (AO giả) | `groundAO(...)` |
| Viền sáng | `rimLight(ctx, pathFn, cx, cy, r)` — stroke bằng gradient sáng-dần-về-phía-nắng |
| Viền tối silhouette | `outline(ctx, pathFn, SHADOW_TINT, 1.4)` — **không bao giờ dùng đen tuyền** |
| Thân khối 3 sắc độ | `bodyGradient(ctx, cx, top, bottom, baseHex)` |

## 2. Bảng màu

- Outline chung: `SHADOW_TINT = #2a1f38`; rim: `RIM_LIGHT = rgba(255,247,209,0.78)`; shadow lạnh: `COOL_SHADOW = #3b2a4d`.
- Token theo level trong `src/rendering/Palette.ts` (`getThemeArt(levelId)`): `groundTint`, `ambient`, `fog`, `foliageTip`, `foliageBase`, `accent`, `vfxPrimary`, `vfxSecondary`, `decal`.
- Phe ta (tower/lính): **vàng – đồng – xanh dương**. Phe địch: **lục – đỏ – tím**.
- VFX: phép **tím-lam**, lửa **cam-vàng**, băng **lam-trắng**, độc **lục-vàng**.

## 3. Sprite pipeline (bắt buộc)

`src/rendering/SpriteBank.ts` bake mỗi sprite **một lần** ở độ phân giải ×2–3 rồi blit thu nhỏ; đây là thứ làm nét vẽ procedural hết răng cưa.

```ts
const spr = sprites.get(`tower:${dataId}:${level}:${spec ?? 'base'}`, w, h, (ctx, w, h) => { /* vẽ 1× */ });
sprites.blit(ctx, spr, x, y, w, h, { ax: 0.5, ay: 1 }); // ay=1 ⇒ (x,y) là chân vật thể
```

Quy tắc vàng:
1. **Key phải chứa mọi biến thể hình ảnh** (loại, level, spec, frame, hướng, theme, variant).
2. **Không bao giờ** đưa giá trị biến thiên liên tục vào key (máu, cooldown, thời gian) — hãy bucket (8 mức) hoặc vẽ trực tiếp lên trên sprite đã blit.
3. Mỗi frame chỉ được **blit + vài nét vẽ động** (muzzle flash, vòng choáng, thanh máu).
4. Supersample tự động: `viewport.scale × dpr ≥ 1.6` ⇒ ×3, ngược lại ×2 (đặt trong `Renderer.resize`).
5. Cache LRU 300 entry; xem `sprites.stats()` trên overlay F1 (`sprites N cached bakes M hits H ss×K`).

## 4. Tỉ lệ & neo

| Đối tượng | Kích thước vẽ | Neo |
|---|---|---|
| Prop nhỏ (rock/bush/mushroom/stump/bones/sign) | 40–80 px | chân (`ay = 1`) |
| Cây | 90–190 px | chân |
| Enemy thường | 60–110 px | `ay ≈ 0.62` (chân hơi dưới tâm) |
| Troll / Warlord | 120–190 px | `ay ≈ 0.66` |
| Tower | 90–170 px | chân |
| Castle / Gate | 140–240 px | chân |
| Đạn | 14–40 px | tâm |
| Icon UI | 24 / 32 / 48 px | tâm |

**Không được phóng to footprint của enemy/tower** quá ~15%: `enemy.size` và bán kính click (22 px) là hợp đồng với gameplay.

## 5. Nguyên tắc animation

1. **Squash & stretch** khi bước và khi nhận đòn (scaleY 0.94–1.0; hit squash 90 ms).
2. **Anticipation** trước khi bắn (lùi/nghiêng 80–120 ms).
3. **Follow-through**: nòng pháo lùi rồi trả về 120 ms; cờ/tua rua trễ pha 1 nhịp.
4. **Idle không bao giờ đứng yên tuyệt đối**: bob 1–2 px, chu kỳ 1.2–2.2 s, lệch pha theo `id`.
5. **Hit-stop** 60–90 ms cho đòn nặng (`Game.hitStop`), **screen shake** theo bảng dưới, **zoom punch** khi thắng/boss.
6. **Easing ease-out**, không linear (trừ vòng xoay liên tục).

| Sự kiện | Shake | Hit-stop |
|---|---|---|
| Đạn pháo nổ | 3 px / 0.18 s | — |
| Meteor (Rain of Fire) | 9 px / 0.45 s | 70 ms |
| Warlord gầm (stun) | 6 px / 0.35 s | — |
| Base bị đánh | 6 px / 0.3 s + red flash | — |
| Enemy chết | ≤4 px / 0.2 s | — |
| Thắng | zoom 1.05 | — |

## 6. Post-processing

`src/core/postfx.ts` chạy **sau khi vẽ thế giới, trước khi vẽ HUD**:
1. **Bloom** — downsample canvas xuống 1/4, bright-pass bằng multiply chính nó 2 lần, blit trả về với `lighter` (alpha 0.42). Không dùng `ctx.filter` toàn màn hình.
2. **Fog** — phủ màu `themeArt.fog` theo level.
3. **Color grade** — `overlay` ambient ấm + `multiply` groundTint nhẹ.
4. **Vignette** — tối 4 góc vùng chơi.
5. **Film grain** — mặc định **tắt** (làm bẩn palette cartoon).
- Tắt toàn bộ bằng `?fx=0` để đo hiệu năng / cho máy yếu.

## 7. Ngân sách hiệu năng (đo được)

| Chỉ số | Ngân sách |
|---|---|
| Frame time p95 | ≤ 16.7 ms (60 fps) ở 81 enemy + 35 prop |
| Chi phí render trung bình | ≤ 11 ms (mốc đo Phase 0: 10.44 ms) |
| Chi phí update | ≤ 1 ms (mốc đo: 0.108 ms) |
| Particle | cap 600 (pool) |
| Floating text | cap 60 |
| Corridor: sprite cache | ≤ 300 entry, `sprites.stats()` để theo dõi |

## 8. UI

- Khung **9-slice** gỗ/da, bake 1 lần: bóng ngoài → viền tối → mặt trong có inner highlight → vân.
- Nút 4 trạng thái: normal / hover (+8% sáng, scale 1.03, 120 ms) / press (dịch 2 px, tối 10%) / disabled (giảm bão hoà, alpha 0.6).
- Chữ: `MedievalSharp` cho tiêu đề, `Inter` cho số liệu. **Tối thiểu 12 px**, số dùng `tabular-nums`.
- **Không emoji, không glyph text làm icon** (`🏹 ⚔ 🔥 ▶ ❚❚ ✕ + ⚡ ⚠`) — tất cả phải là vector trong `src/rendering/Icons.ts`.
- Hình học của mọi phần tử có hit-test trong `src/core/game.ts` là **hợp đồng bất biến** (xem bảng trong prompt giao việc UI).

## 9. Checklist tự chấm một ảnh chụp

1. Có nhận ra từng loại đơn vị trong **0.2 giây** chỉ bằng silhouette không?
2. Outline có liền mạch, không chỗ dày chỗ mỏng, không dùng đen tuyền?
3. Bóng có **cùng một hướng** (dưới-phải) trên toàn ảnh không?
4. Có chỗ nào là **một màu phẳng** không? (nếu có ⇒ thiếu 3 sắc độ)
5. Vùng nền có bị **banding/lặp pattern** nhìn thấy được không?
6. Ở 24 px, icon UI có đọc được không?
7. Có chi tiết nào bị **nhoè do bake quá nhỏ** hoặc **răng cưa do không bake** không?
8. So với ảnh chụp trước đó: chỗ nào **thực sự** đẹp hơn, chỗ nào chỉ khác?
