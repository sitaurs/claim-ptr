# Panduan Menjalankan Project Claim-Ptero (Local)

## 1. Prasyarat

- Node.js 18.x atau lebih baru
- npm (Node Package Manager)
- Koneksi internet (untuk instalasi dependensi & WhatsApp QR scan)
- Akses tulis ke filesystem lokal

## 2. Instalasi

```bash
git clone <url-repo-anda>
cd claim-ptero
npm install
```

## 3. Konfigurasi Environment

1. Salin file contoh:
   ```bash
   cp env.example .env
   ```
2. Edit `.env` sesuai kebutuhan:
   - **PORT**: port backend (default 3000)
   - **PANEL_URL** dan **API_KEY**: data Pterodactyl Anda
   - **ADMIN_SESSION_SECRET**: secret session admin
   - **WHATSAPP_GROUP_ID**: ID grup WhatsApp (atau kosongkan untuk test)
   - **ADMIN_NUMBERS**: nomor admin (format 62xxxx, pisahkan koma)
   - **DUMMY_TEST_NUMBERS**: nomor dummy untuk test (opsional)
   - **BASE_URL**: URL aplikasi (default http://localhost:3000)
   - **BOT_PORT**: port bot WhatsApp (default 3001)

## 4. Menjalankan Backend & Bot WhatsApp

**Direkomendasikan: jalankan di dua terminal terpisah**

### Terminal 1: Backend
```bash
npm run dev
```
Akses: [http://localhost:3000](http://localhost:3000)

### Terminal 2: Bot WhatsApp
```bash
npm run dev-bot
```
- Scan QR code yang muncul di terminal dengan aplikasi WhatsApp Anda (hanya saat pertama kali).
- Bot akan otomatis terhubung ke grup jika konfigurasi benar.

## 5. Alur Pengujian Lokal

- Buka [http://localhost:3000](http://localhost:3000)
- Klaim server dengan nomor WhatsApp Anda
- Untuk nomor dummy (DUMMY_TEST_NUMBERS), OTP tidak dikirim ke WA, tapi ke admin (ADMIN_NUMBERS)
- Dummy number bisa klaim berulang tanpa batas

## 6. Skrip Penting

- `npm run dev` : jalankan backend (auto-reload dengan nodemon)
- `npm run dev-bot` : jalankan bot WhatsApp (auto-reload)
- `npm run start` : backend production
- `npm run start-bot` : bot WhatsApp production
- `npm run start-all` : backend & bot sekaligus (tidak direkomendasikan untuk dev)
- `npm test` : unit test (Jest)
- `npm run test:e2e` : end-to-end test (Playwright)

## 7. Reset Data & Admin

- Untuk reset data pengguna/server/OTP/promosi:
  ```bash
  curl -X POST http://localhost:3000/admin/flush
  ```
- Untuk reset password admin ke default, hapus file `data/admin.json` lalu restart backend.

## 8. Catatan

- Jangan gunakan API_KEY dan ADMIN_SESSION_SECRET default untuk production.
- Untuk keamanan, gunakan reverse proxy (misal NGINX) jika ingin expose ke publik.
- Semua data disimpan di folder `data/` dalam format JSON.