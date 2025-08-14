# MOOTERACT HUB - Website Klaim Server

Website untuk klaim server Node.js, Python, atau N8n yang terintegrasi dengan grup WhatsApp, termasuk fitur verifikasi OTP, pembuatan akun Pterodactyl, dan pengiriman informasi server melalui WhatsApp.

## 🚀 Fitur Utama

### Untuk Pengguna
- ✅ **Verifikasi WhatsApp OTP**: Sistem verifikasi nomor WhatsApp dengan kode OTP
- 🔐 **Pembuatan Akun Otomatis**: Pembuatan akun Pterodactyl otomatis setelah verifikasi
- 🖥️ **Server Gratis**: Pembuatan server Node.js dan Python otomatis
- 📋 **Request N8N**: Permintaan server N8n dengan sistem persetujuan admin
- 📱 **Notifikasi WhatsApp**: Detail akun dikirim melalui WhatsApp setelah server dibuat
- 👋 **Auto Greeting**: Pesan selamat datang otomatis untuk anggota baru grup WhatsApp

### Untuk Admin
- 📊 **Dashboard Admin**: Monitoring pengguna, server, dan request
- ⚙️ **Konfigurasi Lengkap**: Pengaturan Pterodactyl, WhatsApp, dan template server
- 🛠️ **Template Server**: Konfigurasi custom untuk Node.js dan Python (egg, docker image, limits, dll)
- 📢 **Sistem Promosi**: Promosi otomatis dengan interval yang dapat disesuaikan
- 🔔 **Notifikasi Real-time**: Notifikasi WhatsApp untuk setiap request N8N baru
- 🤖 **Admin Commands**: Command bot WhatsApp untuk manajemen sistem
- 👥 **Manajemen User**: Kelola pengguna dan lihat server mereka
- 📋 **Request Management**: Approve/reject request N8N langsung dari WhatsApp

## 🛠️ Teknologi yang Digunakan

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Template Engine**: EJS
- **Penyimpanan Data**: JSON (tanpa database)
- **WhatsApp API**: Baileys
- **Panel Server**: Pterodactyl
- **Authentication**: bcrypt untuk password hashing

## 📁 Struktur Proyek

```
├── data/                  # Penyimpanan data JSON
│   ├── admin.json         # Data admin
│   ├── config.json        # Konfigurasi sistem
│   ├── n8n_requests.json  # Permintaan server N8n
│   ├── otps.json          # Data OTP
│   ├── promotions.json    # Data promosi
│   ├── servers.json       # Data server
│   └── users.json         # Data pengguna
├── middleware/            # Middleware Express
│   └── auth.js            # Autentikasi admin
├── public/                # File statis (CSS, JS, gambar)
│   ├── css/
│   ├── img/
│   └── js/
├── routes/                # Rute aplikasi
│   ├── api.js             # API endpoints
│   ├── web.js             # Rute halaman web
│   └── admin/             # Rute admin
│       ├── config.js      # Konfigurasi admin
│       └── requests.js    # Manajemen request
├── services/              # Layanan aplikasi
│   ├── admin.js           # Layanan admin
│   ├── config.js          # Manajemen konfigurasi
│   ├── otp.js             # Layanan OTP
│   ├── promotion.js       # Layanan promosi
│   ├── pterodactyl.js     # Integrasi Pterodactyl
│   ├── request.js         # Manajemen request
│   ├── user.js            # Manajemen pengguna
│   ├── whatsapp.js        # Layanan WhatsApp
│   └── whatsapp-admin.js  # Admin commands WhatsApp
├── views/                 # Template EJS
│   ├── admin/             # Halaman admin
│   │   ├── config.ejs
│   │   ├── dashboard.ejs
│   │   ├── layout.ejs
│   │   ├── login.ejs
│   │   ├── n8n-requests.ejs
│   │   ├── promotions.ejs
│   │   ├── requests.ejs
│   │   ├── server-templates.ejs
│   │   └── users.ejs
│   ├── claim.ejs
│   ├── create-account.ejs
│   ├── create-server.ejs
│   ├── index.ejs
│   ├── success.ejs
│   └── verify.ejs
├── whatsapp/              # Bot WhatsApp
│   ├── bot.js             # Bot utama
│   ├── start-bot.js       # Server bot
│   └── auth/              # File autentikasi WhatsApp
├── index.js               # Server utama
├── start-bot.js           # Starter bot (legacy)
└── package.json
```

## 🔧 Instalasi dan Konfigurasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd claim-ptero
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

1. Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

2. Edit file `.env`:

```env
# Server Configuration
PORT=3000

# Pterodactyl Panel Configuration
PANEL_URL=https://panel.example.com
API_KEY=your_pterodactyl_api_key

# Admin Configuration
ADMIN_SESSION_SECRET=your_session_secret

# WhatsApp Configuration
WHATSAPP_GROUP_ID=your_whatsapp_group_id
```

### 4. Konfigurasi Data

File `data/config.json` akan dibuat otomatis dengan konfigurasi default. Anda dapat mengubahnya melalui dashboard admin atau mengedit manual:

```json
{
  "server": {
    "port": 3000,
    "admin_session_secret": "your_secret_key"
  },
  "pterodactyl": {
    "panel_url": "https://panel.example.com",
    "api_key": "your_api_key"
  },
  "whatsapp": {
    "group_id": "group_id@g.us",
    "auto_start": true,
    "admin_commands": [...]
  },
  "server_templates": {
    "nodejs": { ... },
    "python": { ... }
  }
}
```

## 🚀 Menjalankan Aplikasi

### Mode Development (Recommended)

Jalankan backend dan bot WhatsApp secara terpisah:

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Bot WhatsApp  
npm run dev-bot
```

### Mode Production

```bash
# Jalankan semua sekaligus
npm run start-all

# Atau jalankan terpisah
npm start              # Backend saja
npm run start-bot      # Bot WhatsApp saja
```

### Akses Aplikasi

- **Website**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin`
- **Login Admin Default**:
  - Username: `admin`
  - Password: `admin123`

## 📱 Setup WhatsApp Bot

1. Saat pertama menjalankan bot, scan QR code yang muncul di terminal
2. Bot akan terhubung dan siap menerima command
3. Bot akan otomatis mengirim greeting ke member baru grup

## 🎯 Cara Penggunaan

### Alur Klaim Server (User)

1. **Akses Website** → Buka `http://localhost:3000`
2. **Klik "Klaim Server"** → Masukkan nomor WhatsApp
3. **Verifikasi OTP** → Masukkan kode yang dikirim via WhatsApp
4. **Buat Akun** → Isi data akun (email, nama, password)
5. **Pilih Server** → Pilih Node.js atau Python (otomatis dibuat)
6. **Terima Detail** → Detail akun dikirim via WhatsApp

### Alur Request N8N

1. **Pilih N8N** → Saat pemilihan server, pilih N8N
2. **Isi Alasan** → Jelaskan kebutuhan N8N Anda
3. **Kirim Request** → Request dikirim ke admin
4. **Notifikasi Admin** → Admin menerima notifikasi via WhatsApp
5. **Approval** → Admin approve/reject via dashboard atau WhatsApp command

### Admin Commands (WhatsApp)

```
!help          - Tampilkan daftar perintah
!status        - Cek status sistem
!stats         - Statistik detail sistem
!requests      - Lihat pending requests
!approve <id>  - Approve N8N request
!reject <id>   - Reject N8N request
!broadcast <msg> - Kirim broadcast ke grup
!restart       - Restart bot WhatsApp
```

## ⚙️ Konfigurasi Admin Dashboard

### 1. Template Server

- **Akses**: Admin Panel → Template Server
- **Fitur**: 
  - Konfigurasi egg ID, docker image, startup command
  - Set resource limits (memory, disk, CPU, IO)
  - Environment variables custom
  - Test template functionality

### 2. Konfigurasi Sistem

- **Server**: Port, auto-start WhatsApp
- **Pterodactyl**: Panel URL, API key
- **WhatsApp**: Group ID, admin commands
- **Templates**: Node.js dan Python settings

### 3. Manajemen User & Server

- **Users**: Lihat semua pengguna terdaftar
- **Servers**: Monitor server per user
- **Requests**: Kelola request N8N
- **Promotions**: Atur promosi otomatis

## 🔐 Keamanan

1. **Ubah Password Admin**: Segera ubah password default setelah instalasi
2. **API Key Security**: Jangan bagikan API key Pterodactyl
3. **HTTPS**: Gunakan HTTPS untuk production
4. **Firewall**: Batasi akses ke endpoint admin
5. **Session Secret**: Gunakan session secret yang kuat

## 🐛 Troubleshooting

### Bot WhatsApp Tidak Terhubung

1. Pastikan folder `whatsapp/auth` ada dan dapat ditulis
2. Hapus folder `whatsapp/auth` untuk reset sesi
3. Pastikan WhatsApp di ponsel sudah versi terbaru
4. Cek koneksi internet

### Error Login Admin

1. Pastikan password `admin123` untuk username `admin`
2. Cek file `data/admin.json` 
3. Reset password via service jika perlu

### Error Membuat Server

1. Periksa API key Pterodactyl valid
2. Pastikan egg ID tersedia di panel
3. Cek resource availability di node
4. Periksa log aplikasi untuk detail error

### Error WhatsApp Commands

1. Pastikan bot terhubung ke grup
2. Cek group ID di konfigurasi
3. Verifikasi admin commands format

## 📝 Pengembangan

### Menambah Server Type Baru

1. Tambahkan template di `data/config.json`
2. Update service `pterodactyl.js`
3. Tambahkan UI di admin dashboard
4. Update validation di API

### Custom Admin Commands

1. Edit `services/whatsapp-admin.js`
2. Tambahkan command di `data/config.json`
3. Update handler di `whatsapp/bot.js`

## 📄 Lisensi

MIT License - Lihat file LICENSE untuk detail lengkap.

## 👥 Kontributor

- **Developer**: MOOTERACT Team
- **Support**: admin@mooteract.com

---

**⚠️ Catatan Penting**: 
- Selalu backup data sebelum update
- Test di environment development dulu
- Monitor resource usage secara berkala
- Jangan lupa update password default!
