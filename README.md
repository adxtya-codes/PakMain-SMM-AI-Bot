# PakMain SMM AI Bot 🤖

A Node.js-based WhatsApp automation bot that connects WordPress form submissions to WhatsApp and email notifications using **whatsapp-web.js** and **Resend API**.  
This bot automatically notifies the admin whenever a new client fills out a form on the WordPress website.

---

## 🚀 Features

- ✅ **WhatsApp integration** — Sends form submission details directly to WhatsApp using `whatsapp-web.js`.
- 📧 **Email notifications** — Sends the same form details to the admin via Resend email API.
- 🌐 **Express webhook** — Receives form data through a secure POST endpoint.
- 🔒 **.env configuration** — Keeps API keys and sensitive data private.
- ⚙️ **LocalAuth support** — Stores WhatsApp session automatically; no need to scan QR every time.
- 💬 **Smart message handling** — Detects keywords like "confirm", "question", or "change" to respond intelligently.
- 🧾 **Structured communication flow** — Automates order confirmation and payment link sharing.

---

## 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **whatsapp-web.js**
- **dotenv**
- **axios**
- **Resend API**
- **qrcode-terminal**
