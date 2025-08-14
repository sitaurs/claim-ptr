# Panduan Instalasi MOOTERACT HUB

Panduan ini akan membantu Anda menginstal dan mengkonfigurasi MOOTERACT HUB, platform klaim server Pterodactyl dengan verifikasi WhatsApp.

## Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:

1. Node.js (versi 16 atau lebih baru)
2. npm (biasanya terinstal bersama Node.js)
3. Panel Pterodactyl yang sudah berjalan
4. Akses ke API Pterodactyl (Application API Key)

## Langkah 1: Mengkloning Repositori

```bash
git clone https://github.com/username/claim-ptero.git
cd claim-ptero
```

## Langkah 2: Menginstal Dependensi

```bash
npm install
```

## Langkah 3: Konfigurasi

1. Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

2. Edit file `.env` dan sesuaikan dengan konfigurasi Anda:

```
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

Keterangan:
- `PORT`: Port untuk menjalankan aplikasi web (default: 3000)
- `PANEL_URL`: URL panel Pterodactyl Anda
- `API_KEY`: Application API Key dari panel Pterodactyl
- `ADMIN_SESSION_SECRET`: Secret key untuk sesi admin (buat string acak)
- `WHATSAPP_GROUP_ID`: ID grup WhatsApp untuk notifikasi (opsional)

## Langkah 4: Menjalankan Aplikasi

### Mode Development

```bash
npm run dev
```

### Mode Production

```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000` (atau port yang Anda tentukan di file `.env`).

## Langkah 5: Menghubungkan WhatsApp

Saat pertama kali menjalankan aplikasi, bot WhatsApp akan meminta Anda untuk melakukan scan QR code:

1. Buka terminal tempat aplikasi berjalan
2. Scan QR code yang muncul dengan aplikasi WhatsApp di ponsel Anda
3. Setelah terhubung, bot WhatsApp akan aktif dan siap mengirim OTP

## Langkah 6: Login Admin

1. Buka `http://localhost:3000/admin` di browser
2. Login dengan kredensial default:
   - Username: `admin`
   - Password: `admin123`
3. Segera ubah password default setelah login pertama kali

## Konfigurasi Pterodactyl

Pastikan Anda telah mengkonfigurasi Pterodactyl dengan benar:

1. Buat Application API Key di panel Pterodactyl
2. Pastikan node server Pterodactyl sudah dikonfigurasi dengan benar
3. Sesuaikan ID egg di file `services/pterodactyl.js` sesuai dengan egg yang tersedia di panel Anda

## Troubleshooting

### Bot WhatsApp tidak terhubung

1. Pastikan folder `whatsapp/auth` ada dan dapat ditulis
2. Hapus folder `whatsapp/auth` dan coba lagi untuk memulai sesi baru
3. Pastikan versi WhatsApp di ponsel Anda sudah yang terbaru

### Error saat membuat server

1. Periksa log aplikasi untuk detail error
2. Pastikan API key Pterodactyl valid dan memiliki izin yang cukup
3. Periksa apakah node dan egg yang direferensikan di `services/pterodactyl.js` tersedia di panel Anda

## Keamanan

1. Segera ubah password admin default
2. Gunakan HTTPS jika digunakan di lingkungan produksi
3. Jangan bagikan API key Pterodactyl Anda
4. Batasi akses ke endpoint admin dengan firewall jika perlu

## Dukungan

Jika Anda mengalami masalah atau memiliki pertanyaan, silakan buka issue di repositori GitHub atau hubungi tim dukungan kami.