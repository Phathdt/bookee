## ADDED Requirements

### Requirement: Initiate payment for booking

Hệ thống SHALL cung cấp endpoint POST /payments với bookingId và provider (`momo`/`zalopay`/`vnpay`/`stripe`) để tạo Payment với status = `pending` và trả về paymentUrl hoặc dữ liệu redirect tương ứng.

#### Scenario: Customer initiates Momo payment
- **WHEN** customer gọi POST /payments với bookingId và provider = `momo`, booking ở status `pending`
- **THEN** hệ thống tạo Payment record và trả về Momo paymentUrl để redirect

#### Scenario: Pay for non-pending booking
- **WHEN** customer initiates payment cho booking status = `paid`, `cancelled`, hoặc `expired`
- **THEN** hệ thống trả 400 Bad Request

### Requirement: Payment webhook verification

Hệ thống SHALL expose webhook endpoint cho mỗi provider. Webhook handler MUST verify signature/hash theo đặc tả của provider trước khi xử lý. Webhook với signature không hợp lệ SHALL bị từ chối với 401 Unauthorized.

#### Scenario: Valid Momo webhook
- **WHEN** Momo gửi webhook với signature HMAC hợp lệ và transaction success
- **THEN** hệ thống update Payment status = `success`, update Booking status = `paid`, lưu transactionId

#### Scenario: Invalid signature
- **WHEN** webhook đến với signature sai
- **THEN** hệ thống trả 401, không update bất kỳ record nào

### Requirement: Idempotent payment processing

Mỗi `Payment.transactionId` MUST unique (DB constraint). Nếu webhook đến nhiều lần cho cùng transactionId, hệ thống SHALL chỉ áp dụng update lần đầu và trả 200 OK cho lần sau (idempotent).

#### Scenario: Duplicate webhook
- **WHEN** provider gửi cùng webhook cho transactionId X 2 lần
- **THEN** lần đầu update Payment + Booking; lần thứ hai trả 200 OK nhưng không thay đổi state

### Requirement: Payment status synchronization with booking

Khi Payment chuyển sang `success`, hệ thống SHALL trong cùng transaction: update Booking status = `paid`, convert seat lock → BookingSeat permanent, tạo Ticket cho mỗi seat. Nếu Payment `failed`, Booking giữ `pending` cho đến hết TTL lock.

#### Scenario: Successful payment triggers ticket issuance
- **WHEN** payment webhook xác nhận success
- **THEN** trong cùng DB transaction: Booking → `paid`, tạo BookingSeat từ Redis lock, tạo Ticket với QR

#### Scenario: Failed payment
- **WHEN** payment webhook trả status = `failed`
- **THEN** hệ thống set Payment status = `failed`, Booking giữ `pending`, customer có thể retry với provider khác

### Requirement: Provider abstraction

Hệ thống SHALL hiện thực interface `IPaymentProvider` với các method: `createPayment(booking)`, `verifyWebhook(req)`, `parseTransaction(req)`. Mỗi provider (Momo/ZaloPay/VNPay/Stripe) là một implementation tách biệt.

#### Scenario: Add new provider in future
- **WHEN** team thêm provider mới (ví dụ ShopeePay)
- **THEN** chỉ cần thêm 1 class implement `IPaymentProvider`, không cần sửa booking service

### Requirement: Payment timeout

Nếu Payment status = `pending` quá 15 phút mà không nhận được webhook xác nhận, hệ thống SHALL tự động đánh dấu Payment = `timeout` và Booking = `expired`.

#### Scenario: Provider does not respond
- **WHEN** customer khởi tạo payment lúc T, không có webhook đến trước T+15 phút
- **THEN** background job đánh dấu Payment = `timeout` và Booking = `expired`
