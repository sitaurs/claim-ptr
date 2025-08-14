# MOOTERACT HUB - Website Klaim Server

Website untuk klaim server Node.js, Python, atau N8n yang terintegrasi dengan grup WhatsApp, termasuk fitur verifikasi OTP, pembuatan akun Pterodactyl, dan pengiriman informasi server melalui WhatsApp.

## Fitur Utama

- Verifikasi nomor WhatsApp dengan OTP
- Pembuatan akun Pterodactyl otomatis
- Pembuatan server Node.js dan Python otomatis
- Permintaan server N8n dengan persetujuan admin
- Bot WhatsApp untuk verifikasi dan notifikasi
- Greeting otomatis untuk anggota baru grup WhatsApp
- Promosi produk otomatis dengan interval yang bisa disesuaikan

## Teknologi yang Digunakan

- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Template Engine**: EJS
- **Penyimpanan Data**: JSON (tanpa database)
- **WhatsApp API**: Baileys
- **Panel Server**: Pterodactyl

## Struktur Proyek

```
├── data/                  # Penyimpanan data JSON
│   ├── admin.json         # Data admin
│   ├── n8n-requests.json  # Permintaan server N8n
│   ├── otps.json          # Data OTP
│   ├── promotions.json    # Data promosi
│   ├── servers.json       # Data server
│   └── users.json         # Data pengguna
├── public/                # File statis (CSS, JS, gambar)
├── routes/                # Rute aplikasi
│   ├── api.js             # API endpoints
│   └── web.js             # Rute halaman web
├── services/              # Layanan aplikasi
│   ├── otp.js             # Layanan OTP
│   ├── promotion.js       # Layanan promosi
│   ├── pterodactyl.js     # Layanan Pterodactyl API
│   └── user.js            # Layanan pengguna
├── views/                 # Template EJS
│   ├── admin/             # Halaman admin
│   ├── claim.ejs          # Halaman klaim server
│   ├── create-account.ejs # Halaman pembuatan akun
│   ├── create-server.ejs  # Halaman pembuatan server
│   ├── index.ejs          # Halaman utama
│   ├── success.ejs        # Halaman sukses
│   └── verify.ejs         # Halaman verifikasi OTP
├── whatsapp/              # Bot WhatsApp
│   ├── auth/              # Autentikasi WhatsApp
│   └── bot.js             # Implementasi bot
├── .env                   # Variabel lingkungan
├── index.js               # Entry point aplikasi
└── package.json           # Dependensi npm
```

## Instalasi

1. Clone repositori ini
2. Install dependensi dengan menjalankan:
   ```
   npm install
   ```
3. Salin file `.env.example` ke `.env` dan sesuaikan konfigurasi:
   ```
   cp .env.example .env
   ```
4. Edit file `.env` dengan konfigurasi yang sesuai:
   - `PANEL_URL`: URL panel Pterodactyl
   - `API_KEY`: API key Pterodactyl
   - `ADMIN_SESSION_SECRET`: Secret untuk sesi admin
   - `WHATSAPP_GROUP_ID`: ID grup WhatsApp

## Menjalankan Aplikasi

1. Jalankan aplikasi dengan perintah:
   ```
   npm start
   ```
   Atau untuk development:
   ```
   npm run dev
   ```

2. Buka browser dan akses `http://localhost:3000`

3. Untuk login admin, akses `http://localhost:3000/admin/login` dengan kredensial default:
   - Username: `admin`
   - Password: `admin123`

## Penggunaan Bot WhatsApp

1. Saat pertama kali menjalankan aplikasi, bot WhatsApp akan menampilkan QR code di terminal
2. Scan QR code dengan WhatsApp di ponsel Anda untuk mengautentikasi bot
3. Bot akan otomatis terhubung ke grup WhatsApp yang dikonfigurasi

## Fitur Admin

- Dashboard dengan ringkasan data
- Kelola promosi otomatis
- Lihat dan kelola permintaan server N8n
- Lihat daftar pengguna dan server mereka

## Catatan

- Password default untuk admin adalah `admin123`
- Pastikan Anda memiliki akses ke panel Pterodactyl dan API key yang valid
- Untuk penggunaan produksi, disarankan untuk mengubah password admin default

## Lisensi

MIT