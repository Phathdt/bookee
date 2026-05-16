## ADDED Requirements

### Requirement: Ticket generation on payment success

Hệ thống SHALL tạo một Ticket cho mỗi BookingSeat ngay khi Booking chuyển sang `paid`. Mỗi Ticket có qrCode (signed JWT) và status mặc định = `valid`.

#### Scenario: Tickets issued for paid booking
- **WHEN** Booking với 3 seat chuyển sang `paid`
- **THEN** hệ thống tạo 3 Ticket, mỗi Ticket gắn với 1 BookingSeat, qrCode là JWT chứa bookingSeatId, tripId, seatCode, passengerName, expiresAt

#### Scenario: Idempotent ticket creation
- **WHEN** payment webhook đến lần thứ hai cho cùng booking đã `paid`
- **THEN** hệ thống KHÔNG tạo Ticket trùng (idempotent qua bookingSeatId unique trong Ticket)

### Requirement: QR code signing

Ticket QR payload SHALL được sign bằng platform private key (RS256). Payload bao gồm: ticketId, bookingSeatId, tripId, seatCode, passengerName, expiresAt = Trip.arrivalTime + 24h.

#### Scenario: Generate QR
- **WHEN** hệ thống tạo Ticket
- **THEN** qrCode là JWT signed bằng private key, có thể verify offline bằng public key

#### Scenario: QR cannot be forged
- **WHEN** ai đó modify payload của QR
- **THEN** signature verification fail → Ticket không hợp lệ

### Requirement: Ticket check-in by driver

Hệ thống SHALL cung cấp endpoint POST /tickets/{id}/check-in cho driver. Khi check-in thành công, Ticket status SHALL chuyển từ `valid` → `used`. Driver chỉ check-in được Ticket thuộc Trip của vehicle họ lái.

#### Scenario: Driver scans valid ticket
- **WHEN** driver quét QR và gọi POST /tickets/{id}/check-in trên Trip họ phụ trách
- **THEN** hệ thống set Ticket status = `used`, ghi thời gian checkInAt

#### Scenario: Already used ticket
- **WHEN** driver quét lại Ticket đã `used`
- **THEN** hệ thống trả 409 Conflict với mã `ALREADY_USED`, kèm thời gian check-in trước đó

#### Scenario: Driver check-in ticket of other trip
- **WHEN** driver thuộc Trip X check-in Ticket thuộc Trip Y
- **THEN** hệ thống trả 403 Forbidden

### Requirement: Offline check-in support

Driver app SHALL có thể verify QR offline bằng public key (không cần gọi API). Khi có mạng trở lại, app sync trạng thái `used` về server.

#### Scenario: Verify QR offline
- **WHEN** driver app không có mạng, scan QR
- **THEN** app verify signature local, hiển thị thông tin Ticket cho driver, lưu vào queue sync

#### Scenario: Sync after reconnect
- **WHEN** driver app online trở lại
- **THEN** app gửi batch check-in cho các Ticket đã quét offline; server xử lý và phản hồi conflicts (nếu có)

### Requirement: Ticket invalidation on cancellation

Khi Booking bị huỷ sau khi đã `paid` (thông qua refund), hệ thống SHALL set toàn bộ Ticket liên quan sang status = `cancelled`.

#### Scenario: Operator cancels paid booking
- **WHEN** operator process refund và set Booking status = `cancelled`
- **THEN** mọi Ticket thuộc booking đó chuyển sang `cancelled`, không check-in được

### Requirement: Customer ticket retrieval

Hệ thống SHALL cho phép customer xem Ticket của booking qua bookingCode, bao gồm hình QR (PNG hoặc data URI) để in hoặc lưu vào điện thoại.

#### Scenario: Customer fetches ticket QR image
- **WHEN** customer gọi GET /bookings/{code}/tickets
- **THEN** hệ thống trả danh sách Ticket với qrCode dạng JWT + qrImage dạng data URI PNG
