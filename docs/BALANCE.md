# BALANCE — Last Bastion 2.0

## 1. Nguyên tắc một nguồn sự thật (B0)

Mọi con số cân bằng phải nằm trong `src/data/` và không được lặp lại dưới dạng literal trong `src/core/game.ts`.

| Nguồn | Chứa gì |
|---|---|
| `src/data/balance.ts` | quy tắc toàn cục: nhịp wave, trao đổi melee, chỉ số lính mặc định, retry/aim của tower, splash falloff, thông số particle/floating text, cap pool, scatter trang trí, bán kính hit-test UI |
| `src/data/towers.ts` | damage, fireRate, range, cost, damageType, splashRadius, projectileSpeed, **và `soldier` (hp/damage/attackInterval)** cho từng level + spec |
| `src/data/enemies.ts` | hp, speed, armor, magicResist, livesDamage, goldReward, flying, size, **`abilities`** (heal/regen/summon/stun) |
| `src/data/spells.ts` | cooldown, damage, radius, delay, duration, count |
| `src/data/levels.ts` | vàng/máu khởi đầu, path, build slot, wave, `earlyCallBonus` |
| `src/data/types.ts` | hằng số thiết kế: `DESIGN_WIDTH/HEIGHT`, `FIXED_DT`, `SELL_REFUND_RATE`, `STAR_THRESHOLDS` |

Kiểm tra tự động: `grep -nE "= *(50|65|12|3\.5|180|130|2\.5)\b" src/core/game.ts` không còn kết quả thuộc cân bằng.

## 2. Thay đổi số liệu trong Phase 0

Phase 0 **khôi phục** giá trị theo data (trước đây code hardcode giá trị khác). Đây là thay đổi hành vi có chủ ý, không phải tinh chỉnh cân bằng — việc tinh chỉnh thật là **B10 (Phase 2)**.

| Hạng mục | Trước (hardcode) | Sau (từ data) | Ghi chú |
|---|---|---|---|
| Shaman heal | +12 HP mỗi 3.5s | **+5 HP mỗi 3s**, range 80 | giảm ~2.4× |
| Troll regen | +5 HP mỗi 1s | **+4 HP mỗi 1s** | giảm 20% |
| Warlord summon | 2 goblin mỗi 9s | **3 goblin mỗi 10s** | minion spawn trên path, không teleport vào base |
| Warlord stun | range 130, 2.5s, mỗi 9s | **range 120, 2s, mỗi 8s** | stun giờ cũng khoá barracks |
| Rain of Fire | 50 dmg, r=65, rơi ~0.4s | **80 dmg, r=80, rơi 0.8s, 5 meteor** | có falloff theo bán kính |
| Reinforcements | lifespan 16s | **lifespan 15s**, hp 60, dmg 8, 0.9s | hết hạn là biến mất, không hồi sinh |
| Lính barracks L1/L2/L3 | dmg 7/12/17, interval 0.8s | **dmg 5/10/18, interval 1.0/0.909/0.833s** | lấy từ `towers.ts.soldier` |
| Knights | hp 180, dmg 22, 0.8s | **hp 180, dmg 20, 1.0s** | hồi máu theo thời gian vẫn ở Phase 2 (B2) |
| Rangers | y hệt barracks thường (vô tác dụng) | **dmg 35, 0.667s** | spec này giờ mới thực sự hoạt động |
| Enemy đánh lính | `max(5, 8% maxHp)` mỗi 0.8s | không đổi (đã vào balance.ts) | |
| Splash | full damage tới rìa | **100% ở tâm → 40% ở rìa**, 1 nguồn không trúng 1 enemy 2 lần trong 0.1s | B3 làm sớm |

## 3. Bảng DPS tham chiếu sau Phase 0

DPS của tower bắn đạn = `damage × fireRate`. DPS của barracks = `2 lính × damage / attackInterval`.

| Tower / spec | DPS L1 | DPS L2 | DPS L3/spec | Chi phí tới L3/spec | DPS/gold |
|---|---|---|---|---|---|
| Archer | 9.6 | 19.6 | 35.2 | 340 | 0.104 |
| Mage | 10.8 | 25.2 | 44.8 | 500 | 0.090 |
| Cannon (splash, có falloff) | 10 | 22 | 39 | 595 | 0.066 |
| Barracks (2 lính) | 10 | 22 | 43.2 | 340 | 0.127 |
| Sharpshooter | — | — | 36 | 570 | 0.063 |
| Rapid Volley (3 đạn) | — | — | 90 | 570 | **0.158** |
| Arcane Blast (splash) | — | — | 54 | 800 | 0.068 |
| Slow Hex | — | — | 36 | 800 | 0.045 |
| Heavy Bombard | — | — | 40 | 945 | 0.042 |
| Cluster Bombs | — | — | 27.5 | 945 | 0.029 |
| Knights | — | — | 40 | 570 | 0.070 |
| Rangers | — | — | 105 | 570 | **0.184** |

**Kết luận cho B10 (Phase 2):** hai outlier là **Rangers (0.184)** và **Rapid Volley (0.158)**; nhóm yếu là **Cluster Bombs (0.029)**, **Heavy Bombard (0.042)**, **Slow Hex (0.045)**. Mục tiêu Phase 2: đưa mọi spec về dải **0.08–0.14 DPS/gold** và bù lại bằng hiệu ứng cơ chế (crit, slow, mini-nổ) thay vì chỉ tăng số.

## 4. Việc còn lại (Phase 2 — B10)

1. Scale HP enemy theo level (hệ số 1.0 → 1.6) thay vì chỉ tăng số lượng.
2. Bonus gọi wave sớm theo tỉ lệ thời gian còn lại (`bonus = base × remaining / total`) để chặn snowball; hiện tại là cộng thẳng (level 1 tổng 185 vàng, level 5 tổng 300 vàng).
3. Rà lại `earlyCallBonus` và `startingGold` của cả 5 level sau khi có số liệu chơi thật.
4. Chứng minh level 5 thắng được 3 sao ở Normal bằng nhật ký mô phỏng (test headless, B18).
5. Giá trị `spells.ts`, `towers.ts` sau khi tinh chỉnh phải được cập nhật lại trong bảng mục 3.
