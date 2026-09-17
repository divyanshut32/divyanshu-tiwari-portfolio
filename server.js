require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

const db = new Database(path.join(__dirname, "messages.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read INTEGER NOT NULL DEFAULT 0
  )
`);

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many messages. Please try again later." }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const sessions = new Map();

function clean(value, max = 2000) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}
function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token) || sessions.get(token) < Date.now()) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  next();
}

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/contact", contactLimiter, async (req, res) => {
  const name = clean(req.body.name, 80);
  const email = clean(req.body.email, 160);
  const subject = clean(req.body.subject, 160) || "New portfolio enquiry";
  const message = clean(req.body.message, 4000);

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: "Please enter your name, email and message." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Please enter a valid email address." });
  }

  const info = db.prepare(
    "INSERT INTO messages (name,email,subject,message) VALUES (?,?,?,?)"
  ).run(name, email, subject, message);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !process.env.CONTACT_TO || !emailFrom) {
    return res.json({ ok: true, saved: true, messageId: info.lastInsertRowid, message: "Message saved. Email delivery is not configured yet." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { minVersion: "TLSv1.2" }
    });

    await transporter.sendMail({
      from: `"Divyanshu Tiwari Portfolio" <${emailFrom}>`,
      to: process.env.CONTACT_TO,
      replyTo: email,
      subject: `[Portfolio] ${subject}`,
      text: `New portfolio enquiry\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:24px">
        <h2>New portfolio enquiry</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Subject:</b> ${escapeHtml(subject)}</p><hr>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>`
    });

    return res.json({ ok: true, message: "Message sent successfully. I’ll get back to you soon." });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ ok: false, saved: true, message: "Message was saved, but email delivery failed. Please try again later." });
  }
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const user = clean(req.body.username, 80);
  const password = String(req.body.password || "");
  if (user !== (process.env.ADMIN_USER || "admin") || password !== (process.env.ADMIN_PASSWORD || "")) {
    return res.status(401).json({ ok: false, message: "Invalid admin credentials." });
  }
  const raw = `${user}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const token = `${raw}.${sign(raw)}`;
  sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
  res.json({ ok: true, token });
});

app.get("/api/admin/messages", auth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 200").all();
  res.json({ ok: true, messages: rows });
});

app.patch("/api/admin/messages/:id/read", auth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE messages SET read = 1 WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.delete("/api/admin/messages/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "Divyanshu Tiwari Portfolio" }));

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Divyanshu Tiwari Portfolio running on http://localhost:${PORT}`));
