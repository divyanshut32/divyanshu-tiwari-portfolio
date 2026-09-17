# Divyanshu Tiwari Portfolio v2 — Full Stack

A production-ready starting point for Divyanshu Tiwari's personal portfolio.

## New in v2
- Dark/light mode toggle
- Floating WhatsApp contact button
- GitHub buttons on projects
- Private admin inbox at `/admin.html`
- SQLite message storage
- Email notification through Brevo SMTP/Nodemailer
- Mark messages as read
- Delete messages
- Reply directly from the admin inbox
- Rate limiting and security headers
- Resume download
- Supplied photos included
- Public deployment instructions

## Local setup

**Do not open `public/index.html` by double-clicking it.** The site uses `/style.css`, `/assets/...` and backend `/api/...` routes, so it must run through the Node/Express server.

Requirements: Node.js 18+.

### Easiest on Windows
Double-click `START-WEBSITE.bat`. It installs dependencies, starts the server, and opens the website.

### Manual
```bash
npm install
```

Copy `.env.example` to `.env` and configure:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=YOUR_BREVO_SMTP_LOGIN
SMTP_PASS=YOUR_BREVO_SMTP_KEY
EMAIL_FROM=divyanshutiwari085@gmail.com
CONTACT_TO=divyanshutiwari085@gmail.com
ADMIN_USER=admin
ADMIN_PASSWORD=USE_A_STRONG_PASSWORD
SESSION_SECRET=USE_A_LONG_RANDOM_SECRET
PORT=3000
```

Then:

```bash
npm start
```

Open:
- Portfolio: `http://localhost:3000`
- Admin inbox: `http://localhost:3000/admin.html`

### Brevo email delivery

This version uses Brevo SMTP instead of Gmail SMTP. In Brevo, open **Settings → SMTP & API → SMTP**, create an SMTP key, and put the SMTP login/key into `.env`.

`EMAIL_FROM` must be a sender address verified in Brevo. `CONTACT_TO` is the inbox where you want portfolio enquiries delivered. Never put your normal Gmail password or Brevo SMTP key into frontend code or GitHub.

### Admin security

Change `ADMIN_PASSWORD` before deployment. Set a long random `SESSION_SECRET`. The admin token is stored in the browser for the session duration.

### Public website / custom domain

Deploy the Node app to any hosting service that supports a persistent Node.js process and SQLite-compatible filesystem. Add all environment variables in the host dashboard. The host gives you an HTTPS URL.

For a custom domain:
1. Buy a domain from a registrar.
2. Add the domain to your hosting provider.
3. Follow the host's DNS instructions.
4. Use the host's HTTPS/SSL certificate.
5. Test `https://yourdomain.com` and `https://yourdomain.com/admin.html`.

### Important for SQLite

`messages.db` is created automatically. If your hosting provider has an ephemeral filesystem, use persistent storage or replace SQLite with a managed database before production.

### Personalization

The website identity and resume now use Divyanshu Tiwari.

## Contact flow

Visitor → portfolio contact form → `/api/contact` → SQLite database + email notification → admin inbox.

The visitor never sees your email password.
