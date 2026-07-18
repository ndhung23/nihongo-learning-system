# Bảo mật dữ liệu đề thi JLPT

## Trạng thái hiện tại

Nguồn đề, master data, script chứa đáp án và bản thử nghiệm giao diện thi N5
được chặn bằng `.gitignore`. Các tệp này chỉ tồn tại trên máy phát triển và
không được đưa lên kho Git công khai.

Trước khi push, chạy:

```powershell
npm run security:check-data
```

Lệnh phải báo không có dữ liệu JLPT riêng tư đang được Git theo dõi.

## Kiến trúc dùng cho production

1. Import master data vào MongoDB bằng một tác vụ quản trị chạy trong môi
   trường riêng tư.
2. Không commit tệp import, master JSON hoặc đáp án vào kho mã nguồn công khai.
3. Module truy cập đề thi phải có `import "server-only"`.
4. API lấy câu hỏi chỉ trả về `id`, `instruction`, `prompt` và `options`.
   Không trả `correctIndex` hoặc `explanation` trước khi người học nộp đáp án.
5. API chấm điểm dùng `POST`, kiểm tra phiên đăng nhập, xác thực mọi trường đầu
   vào và chỉ trả kết quả cần thiết cho lần nộp đó.
6. Thêm giới hạn tần suất để giảm khả năng dò toàn bộ đáp án qua API.

## Không được làm

- Không truyền bản ghi MongoDB đầy đủ vào Client Component.
- Không dùng biến môi trường có tiền tố `NEXT_PUBLIC_` để chứa khóa hoặc đáp án.
- Không dùng Base64, mã hóa JavaScript hay đổi tên trường để “giấu” đáp án;
  người dùng vẫn có thể đọc dữ liệu đã gửi xuống trình duyệt.
- Không dùng `git add -f` cho bất kỳ đường dẫn JLPT riêng tư nào.
