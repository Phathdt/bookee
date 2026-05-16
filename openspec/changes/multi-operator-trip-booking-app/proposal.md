## Why

Thị trường đặt vé xe khách liên tỉnh (intercity bus/limousine) tại Việt Nam đang phân mảnh — mỗi nhà xe lớn như Phương Trang (Futa), Thành Bưởi, Kumho đều có hệ thống bán vé riêng, gây khó khăn cho hành khách khi cần so sánh giá, lịch trình và chọn ghế. Hệ thống aggregator (đa nhà xe) cho phép khách hàng tìm kiếm, đặt vé và thanh toán trên một nền tảng duy nhất, đồng thời cung cấp công cụ quản lý vận hành cho các nhà xe tham gia.

## What Changes

- Xây dựng nền tảng đặt vé xe đa nhà xe (multi-operator) từ đầu — chưa có hệ thống hiện tại.
- Thiết lập domain model rõ ràng với 14 entity chính, tách biệt `Route` (template tuyến đường) và `Trip` (instance chuyến cụ thể) để scale theo lịch chạy hàng ngày.
- Hỗ trợ nhiều loại xe (sleeper / limousine / seater) với `SeatLayout` tái sử dụng giữa các xe cùng loại.
- Quy trình đặt vé end-to-end: tìm tuyến → chọn ghế → nhập thông tin hành khách → thanh toán → nhận vé QR.
- Tích hợp đa cổng thanh toán Việt Nam (Momo, ZaloPay, VNPay) và quốc tế (Stripe).
- Hỗ trợ multi-role (customer / operator / driver / admin) với quyền truy cập khác nhau.
- Hệ thống coupon/promotion và quản lý vé QR cho check-in tại bến.

## Capabilities

### New Capabilities

- `user-management`: Quản lý tài khoản người dùng, xác thực, phân quyền theo role (customer/operator/driver/admin).
- `operator-management`: Quản lý thông tin nhà xe (BusCompany) — hồ sơ, hotline, logo, trạng thái hoạt động.
- `station-management`: Quản lý điểm đón/trả (Station) với địa chỉ, toạ độ GPS, thành phố.
- `route-catalog`: Quản lý tuyến đường (Route) giữa các station, gắn với nhà xe, khoảng cách và thời gian dự kiến.
- `fleet-management`: Quản lý đội xe (Vehicle) của nhà xe — biển số, loại xe, sơ đồ ghế gắn kèm.
- `seat-layout-catalog`: Quản lý sơ đồ ghế (SeatLayout) và danh sách ghế (Seat) tái sử dụng giữa các xe.
- `trip-scheduling`: Tạo và quản lý chuyến xe cụ thể (Trip) theo lịch trình — gắn route + vehicle + thời gian khởi hành.
- `trip-search`: Tìm kiếm chuyến xe theo điểm đi/đến/ngày, lọc theo nhà xe, loại xe, khoảng giá.
- `seat-booking`: Đặt vé với chọn ghế (BookingSeat), thông tin hành khách (Passenger), giữ ghế tạm thời.
- `payment-processing`: Xử lý thanh toán đa cổng (Momo/ZaloPay/VNPay/Stripe), xác nhận giao dịch và cập nhật trạng thái booking.
- `promotion-management`: Quản lý coupon/mã giảm giá với loại discount, giá trị, hạn sử dụng.
- `ticket-issuance`: Phát hành vé điện tử với mã QR cho từng ghế, hỗ trợ quét check-in tại bến.

### Modified Capabilities

<!-- None — đây là greenfield project, chưa có spec nào tồn tại. -->

## Impact

- **Codebase**: Project mới (greenfield), chưa có code base hiện tại — toàn bộ stack backend, database schema, API và frontend sẽ được xây dựng từ đầu.
- **Database**: Cần khởi tạo schema mới với 14+ bảng chính cùng index/relationship phù hợp; cần chiến lược concurrency cho `BookingSeat` để chống double-booking.
- **External Dependencies**: Tích hợp với 4 cổng thanh toán (Momo, ZaloPay, VNPay, Stripe) — mỗi cổng có flow callback/webhook riêng.
- **Infrastructure**: Cần Redis (hoặc tương đương) cho seat-locking trong quá trình đặt vé; cần queue cho xử lý payment webhook bất đồng bộ.
- **Compliance**: Lưu trữ thông tin CMND/CCCD hành khách (`Passenger.idCard`) — cần tuân thủ Nghị định 13/2023 về bảo vệ dữ liệu cá nhân.
- **Operator onboarding**: Cần quy trình tiếp nhận và xác minh nhà xe trước khi cho phép họ tạo trip trên hệ thống.
