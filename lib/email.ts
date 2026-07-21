import nodemailer from "nodemailer";

function getEmailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    throw new Error("Cấu hình gửi email chưa đầy đủ.");
  }

  return { host, port, user, pass, from };
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const config = getEmailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Đặt lại mật khẩu Nihongo Learning",
    text: [
      `Xin chào ${name},`,
      "",
      "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Nihongo Learning.",
      `Mở liên kết sau trong vòng 15 phút: ${resetUrl}`,
      "",
      "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
    ].join("\n"),
    html: `
      <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:32px">
          <p style="margin:0 0 12px;color:#e11d48;font-size:12px;font-weight:800;letter-spacing:2px">NIHONGO LEARNING</p>
          <h1 style="margin:0 0 20px;font-size:26px">Đặt lại mật khẩu</h1>
          <p>Xin chào <strong>${safeName}</strong>,</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết bên dưới có hiệu lực trong <strong>15 phút</strong>.</p>
          <p style="margin:28px 0">
            <a href="${safeResetUrl}" style="display:inline-block;border-radius:14px;background:#e11d48;color:#fff;padding:14px 22px;text-decoration:none;font-weight:800">Đặt lại mật khẩu</a>
          </p>
          <p style="font-size:13px;color:#64748b">Nếu nút không hoạt động, sao chép liên kết này vào trình duyệt:</p>
          <p style="word-break:break-all;font-size:13px;color:#0f766e">${safeResetUrl}</p>
          <p style="margin-top:24px;font-size:13px;color:#64748b">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentRequestAdminEmail({
  username,
  userEmail,
  kind,
  amount,
  transferCode,
  createdAt,
}: {
  username: string;
  userEmail: string;
  kind: "ai" | "vip";
  amount: number;
  transferCode: string;
  createdAt: Date;
}) {
  const config = getEmailConfig();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || config.user;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const reviewUrl = `${appUrl}/admin/payments`;
  const benefit = kind === "vip" ? "Nâng cấp VIP" : "Nạp lượt AI";
  const formattedAmount = `${amount.toLocaleString("vi-VN")}đ`;
  const formattedTime = createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: config.from,
    to: adminEmail,
    subject: `[Nihongo] Có yêu cầu chuyển khoản ${formattedAmount}`,
    text: [
      "Có một yêu cầu chuyển khoản mới đang chờ duyệt.",
      "",
      `Người dùng: ${username} (${userEmail})`,
      `Nội dung: ${benefit}`,
      `Số tiền: ${formattedAmount}`,
      `Mã chuyển khoản: ${transferCode}`,
      `Thời gian: ${formattedTime}`,
      "",
      `Mở trang duyệt: ${reviewUrl}`,
    ].join("\n"),
    html: `
      <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:32px">
          <p style="margin:0 0 12px;color:#e11d48;font-size:12px;font-weight:800;letter-spacing:2px">NIHONGO LEARNING · THANH TOÁN</p>
          <h1 style="margin:0 0 20px;font-size:26px">Có yêu cầu chuyển khoản mới</h1>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#64748b">Người dùng</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(username)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(userEmail)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Nội dung</td><td style="padding:8px 0;text-align:right;font-weight:700">${benefit}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Số tiền</td><td style="padding:8px 0;text-align:right;font-size:20px;font-weight:800;color:#0f766e">${formattedAmount}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Mã chuyển khoản</td><td style="padding:8px 0;text-align:right;font-family:monospace;font-weight:800">${escapeHtml(transferCode)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Thời gian</td><td style="padding:8px 0;text-align:right;font-weight:700">${formattedTime}</td></tr>
          </table>
          <p style="margin:28px 0 0"><a href="${escapeHtml(reviewUrl)}" style="display:inline-block;border-radius:14px;background:#0f172a;color:#fff;padding:14px 22px;text-decoration:none;font-weight:800">Mở trang duyệt thanh toán</a></p>
          <p style="margin-top:20px;font-size:12px;line-height:18px;color:#64748b">Đây là thông báo khi người dùng tạo mã chuyển khoản. Hãy kiểm tra tài khoản ngân hàng trước khi duyệt.</p>
        </div>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character,
  );
}
