## ADDED Requirements

### Requirement: Coupon creation

Hệ thống SHALL cho phép admin tạo Coupon với code (case-insensitive, unique), discountType (`percent` hoặc `fixed`), value, expiredAt. Optional: usageLimit (tổng), maxValue (cap khi discountType = `percent`).

#### Scenario: Admin creates percent coupon
- **WHEN** admin gửi POST /coupons với code = "TET2026", discountType = "percent", value = 10, expiredAt = "2026-02-28"
- **THEN** hệ thống tạo Coupon, code lưu uppercase, trả couponId

#### Scenario: Duplicate code
- **WHEN** admin tạo coupon với code đã tồn tại (case-insensitive)
- **THEN** hệ thống trả 409 Conflict

#### Scenario: Invalid percent value
- **WHEN** admin tạo coupon `percent` với value > 100 hoặc < 0
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Apply coupon to booking

Hệ thống SHALL cho phép customer áp coupon code trước khi initiate payment. Hệ thống SHALL validate: code hợp lệ, chưa expired, chưa vượt usageLimit. Số tiền giảm SHALL được tính và lưu vào Booking.

#### Scenario: Valid coupon applied
- **WHEN** customer áp coupon "TET2026" (10% off, max 50k) cho booking totalAmount = 600000
- **THEN** hệ thống tính discount = min(600000 * 10%, 50000) = 50000, totalAmount mới = 550000

#### Scenario: Expired coupon
- **WHEN** customer áp coupon đã expiredAt
- **THEN** hệ thống trả 400 Bad Request với mã `COUPON_EXPIRED`

#### Scenario: Usage limit reached
- **WHEN** customer áp coupon đã đạt usageLimit
- **THEN** hệ thống trả 400 Bad Request với mã `COUPON_EXHAUSTED`

### Requirement: Coupon usage tracking

Hệ thống SHALL tăng `Coupon.usedCount` chỉ khi Booking chuyển sang `paid`. Nếu Booking bị `cancelled` hoặc `expired`, usedCount SHALL không thay đổi.

#### Scenario: Track usage on successful payment
- **WHEN** Booking với coupon code X chuyển sang `paid`
- **THEN** hệ thống tăng Coupon.usedCount += 1

#### Scenario: Cancelled booking with coupon
- **WHEN** Booking đã áp coupon nhưng bị cancelled trước khi paid
- **THEN** usedCount của coupon không tăng

### Requirement: Coupon listing for admin

Hệ thống SHALL cho phép admin liệt kê và filter Coupon theo status (active/expired/exhausted) và xem usedCount.

#### Scenario: Admin lists active coupons
- **WHEN** admin gọi GET /coupons?status=active
- **THEN** hệ thống trả Coupon có expiredAt > now và usedCount < usageLimit (nếu có limit)
