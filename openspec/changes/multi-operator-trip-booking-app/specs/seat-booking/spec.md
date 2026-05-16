## ADDED Requirements

### Requirement: Seat selection with temporary lock

Hệ thống SHALL cho phép customer đã auth chọn 1 hoặc nhiều seat trên một Trip. Khi chọn, hệ thống SHALL tạo lock trên Redis với key `seat-lock:{tripId}:{seatId}`, value = bookingId, TTL 10 phút. Trong khoảng TTL, seat đó MUST không thể được người khác chọn.

#### Scenario: Customer selects available seats
- **WHEN** customer gọi POST /bookings với tripId, seatIds = [A01, A02] và cả 2 ghế chưa bị lock/booked
- **THEN** hệ thống tạo Booking với status = `pending`, tạo Redis lock 10 phút cho A01, A02 và trả bookingCode

#### Scenario: Concurrent selection of same seat
- **WHEN** 2 customer cùng chọn seat A01 trên cùng Trip trong thời gian sát nhau
- **THEN** chỉ 1 customer được tạo booking thành công; customer còn lại nhận 409 Conflict với mã `SEAT_LOCKED`

#### Scenario: Seat already permanently booked
- **WHEN** customer chọn seat đã có BookingSeat với booking status = `paid`
- **THEN** hệ thống trả 409 Conflict với mã `SEAT_TAKEN`

### Requirement: Booking expiration

Hệ thống SHALL tự động set Booking status = `expired` khi Redis lock hết hạn mà thanh toán chưa hoàn tất. Sau khi expired, các seat tương ứng SHALL trở lại available.

#### Scenario: Booking expires before payment
- **WHEN** customer tạo Booking lúc T, không thanh toán, và đến T+10 phút
- **THEN** hệ thống đánh dấu Booking là `expired`, gỡ seat lock, seat available cho người khác

#### Scenario: Payment completes before expiration
- **WHEN** payment webhook xác nhận thành công trước khi lock hết hạn
- **THEN** hệ thống convert seat lock thành BookingSeat permanent trong DB, Booking status = `paid`

### Requirement: Passenger information

Hệ thống SHALL yêu cầu customer cung cấp thông tin Passenger (fullName, phone, idCard) cho mỗi seat khi tạo Booking. Số Passenger MUST khớp với số seat được chọn.

#### Scenario: Mismatched passenger count
- **WHEN** customer book 3 seat nhưng chỉ gửi 2 passenger
- **THEN** hệ thống trả 400 Bad Request

#### Scenario: Save passenger with idCard encrypted
- **WHEN** customer book seat với idCard "012345678901"
- **THEN** hệ thống lưu idCard đã mã hoá AES-256 trong DB và trả response che `***0901`

### Requirement: Booking code generation

Hệ thống SHALL phát sinh `Booking.bookingCode` duy nhất, 8 ký tự alphanumeric (không chứa ký tự dễ nhầm như 0, O, I, 1), dùng để customer tra cứu.

#### Scenario: Unique booking code
- **WHEN** hệ thống tạo Booking
- **THEN** bookingCode được generate đảm bảo unique trên toàn bảng Booking

### Requirement: Booking retrieval

Hệ thống SHALL cho phép customer tra cứu Booking theo bookingCode (cùng email hoặc phone) hoặc liệt kê Booking của mình sau khi auth.

#### Scenario: Customer lists own bookings
- **WHEN** customer authenticated gọi GET /bookings/me
- **THEN** hệ thống trả danh sách Booking của user đó, sắp xếp theo createdAt giảm dần

#### Scenario: Guest lookup by code
- **WHEN** ai đó gọi GET /bookings/lookup với bookingCode + phone khớp
- **THEN** hệ thống trả thông tin booking (không cần auth)

### Requirement: Booking cancellation by customer

Hệ thống SHALL cho phép customer huỷ Booking đang ở `pending` (chưa thanh toán). Booking đã `paid` SHALL chỉ huỷ được qua quy trình refund thủ công của operator.

#### Scenario: Cancel pending booking
- **WHEN** customer gọi POST /bookings/{id}/cancel với booking ở `pending`
- **THEN** hệ thống set status = `cancelled`, gỡ seat lock ngay lập tức

#### Scenario: Attempt to self-cancel paid booking
- **WHEN** customer gọi POST /bookings/{id}/cancel với booking ở `paid`
- **THEN** hệ thống trả 400 Bad Request với hướng dẫn liên hệ operator
