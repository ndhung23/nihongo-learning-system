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
