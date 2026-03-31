import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


import nodemailer from "nodemailer";

// custom plugin to handle local emails without needing Edge functions or Docker
const emailPlugin = () => ({
  name: "email-handler",
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url === "/api/send-email" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk: any) => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const { receipt } = JSON.parse(body);
            if (!receipt?.email) throw new Error("No email provided");

            const envEmail = process.env.SMTP_EMAIL;
            const envPass = process.env.SMTP_APP_PASSWORD;
            
            let transporter, testAccount;

            if (envEmail && envPass) {
              transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: { user: envEmail, pass: envPass }
              });
            } else {
              // Automatically fallback to ethereal if no app password configured
              testAccount = await nodemailer.createTestAccount();
              transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass }
              });
            }

            const info = await transporter.sendMail({
              from: envEmail || '"CareQueue System" <admin@carequeue.local>',
              to: receipt.email,
              subject: `CareQueue: Patient Registration Receipt - Token #${receipt.token_number}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #ffffff;">
                  <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Appointment Confirmed, ${receipt.name}!</h1>
                  <p style="color: #64748b; font-size: 15px; line-height: 1.6;">Your appointment has been successfully registered.</p>
                  <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; text-transform: uppercase; font-weight: 600;">Receipt Details</p>
                    <p><strong>Doctor:</strong> ${receipt.doctor_name}</p>
                    <p><strong>Purpose:</strong> ${receipt.purpose}</p>
                    <p><strong>Token Number:</strong> <span style="font-size: 18px; font-weight: bold; color: #0ea5e9;">#${receipt.token_number}</span></p>
                    <p><strong>Queue Position:</strong> ${receipt.queue_position}</p>
                    <p><strong>Estimated Wait:</strong> ${receipt.estimated_wait_minutes} mins</p>
                  </div>
                  ${receipt.temp_username ? `
                  <div style="background: #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: #475569; font-size: 13px; text-transform: uppercase; font-weight: 600;">Login Credentials</p>
                    <p><strong>Username:</strong> ${receipt.temp_username}</p>
                    <p><strong>Password:</strong> ${receipt.temp_password}</p>
                  </div>
                  ` : ''}
                  <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Thank you for choosing CareQueue!</p>
                </div>
              `
            });

            const url = nodemailer.getTestMessageUrl(info);
            
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, url, isTest: !!testAccount }));
          } catch (e: any) {
            console.error("Vite email proxy error:", e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), emailPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
