# Changelog

Theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/) và [SemVer](https://semver.org/lang/vi/).

## [Chưa phát hành]

### Thêm

- Thẻ Open Graph và ảnh xem trước 1200×630: chia sẻ link demo lên LinkedIn, Facebook, Zalo sẽ hiện ảnh và mô tả.

## [0.3.0] - 2026-11-23

### Thêm

- Xuất CSV phần bảng phiếu cân đang lọc (UTF-8 BOM cho Excel, chặn chèn công thức).
- Kéo thả file phiếu cân vào trang để nhập.
- Viền focus rõ ràng khi dùng bàn phím.
- Test E2E bằng Playwright (desktop + điện thoại) chạy trong CI; deploy chỉ khi E2E pass.

## [0.2.0] - 2026-11-23

### Thêm

- Nhập phiếu cân từ file JSON Lines của weighbridge-reader, báo lỗi từng dòng, chặn xuất quá tồn.
- Giao diện sáng / tối, theo hệ điều hành và nhớ lựa chọn.

### Cải thiện

- Tách biểu đồ ra tải lười: bundle chính giảm từ 681 KB xuống 243 KB (78 KB gzip), hết cảnh báo chunk lớn khi build.

## [0.1.0] - 2026-11-23

### Thêm

- Bản phát hành đầu tiên. Dashboard tồn kho: KPI, biểu đồ nhập–xuất, giá trị tồn theo loại, bảng phiếu cân có lọc, cảnh báo tồn thấp, deploy GitHub Pages.
