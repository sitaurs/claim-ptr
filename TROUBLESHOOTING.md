# Panduan Troubleshooting - Claim Ptero

## 🔄 Masalah Server Restart Berulang (Nodemon)

### Penyebab Umum
1. **File watching yang terlalu luas** - Nodemon memantau file yang tidak perlu
2. **File data JSON berubah** - Aplikasi menulis ke `data/*.json` yang di-watch nodemon  
3. **Missing konfigurasi nodemon** - Tidak ada pengaturan khusus untuk project ini

### ✅ Solusi yang Sudah Diterapkan

#### 1. File [`nodemon.json`](nodemon.json) (BARU)
Konfigurasi nodemon yang optimal:
- **Watch**: Hanya file JS penting (routes, services, middleware)
- **Ignore**: File data, views, test, arsip, auth session
- **Delay**: 2 detik untuk mencegah restart berlebihan

#### 2. File [`.gitignore`](gitignore) (DIPERBAIKI)
Mengabaikan file yang tidak perlu di version control:
- Data JSON (`/data/*.json`)
- Auth session WhatsApp (`/whatsapp/auth`)
- File temporary dan arsip

### 🎯 Cara Testing
```bash
# Stop nodemon yang running
Ctrl+C

# Restart dengan konfigurasi baru
npm run dev
```

**Expected Result**: Server hanya restart ketika ada perubahan kode JS di folder yang relevan.

---

## 🤖 Masalah WhatsApp Bot

### Bot Tidak Terhubung
```bash
# Cek status bot
curl http://localhost:3001/api/bot/status

# Restart bot WhatsApp
npm run dev-bot
```

### QR Code Tidak Muncul
1. Hapus folder `whatsapp/auth`
2. Restart bot: `npm run dev-bot`
3. Scan QR code baru

### Bot Disconnected
- **Temporary**: Bot akan auto-reconnect dalam 30 detik
- **Persistent**: Restart bot dan scan ulang QR

---

## 🗄️ Masalah Database/File

### File Data Corrupt
```bash
# Backup data lama
cp -r data data_backup

# Reset semua data
curl -X POST http://localhost:3000/admin/flush

# Atau manual delete
rm data/*.json
# Restart server untuk regenerate default
```

### Permission Error
```bash
# Windows
icacls data /grant Users:F /T

# Linux/Mac  
chmod -R 755 data/
```

---

## 🔐 Masalah Authentication

### Admin Login Gagal
1. **Reset password admin**:
   ```bash
   rm data/admin.json
   # Restart server, password kembali ke: admin123
   ```

2. **Clear session**:
   ```bash
   # Hapus cookies di browser atau:
   curl -X POST http://localhost:3000/admin/logout
   ```

### OTP Tidak Terkirim
1. **Cek bot status**: `curl http://localhost:3001/api/bot/status`
2. **Cek konfigurasi grup**: Pastikan `WHATSAPP_GROUP_ID` di `.env`
3. **Cek admin numbers**: Pastikan `ADMIN_NUMBERS` di `.env`

---

## 🌐 Masalah Network/Port

### Port Sudah Digunakan
```bash
# Cek port yang digunakan
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Linux/Mac)
kill -9 <PID>
```

### Pterodactyl API Error
1. **Cek koneksi**:
   ```bash
   curl -H "Authorization: Bearer <API_KEY>" <PANEL_URL>/api/client
   ```

2. **Validasi API Key**:
   - Pastikan API Key valid dan tidak expired
   - Cek permission API Key di panel Pterodactyl

---

## 📝 Debug Mode

### Enable Verbose Logging
```bash
# Set environment variable
export DEBUG=*
# atau tambahkan ke .env:
DEBUG=*

npm run dev
```

### Cek Log Files
```bash
# Monitor log real-time
tail -f logs/*.log

# Cek error terakhir
grep -i error logs/*.log | tail -10
```

---

## 🚨 Emergency Recovery

### Total Reset
```bash
# 1. Backup penting
cp .env .env.backup
cp -r data data.backup

# 2. Reset semua
rm -rf node_modules
rm -rf whatsapp/auth
rm -rf data
npm install

# 3. Restore config
cp .env.backup .env

# 4. Restart
npm run dev
```

### Rollback ke Versi Stabil
```bash
git stash
git checkout main  # atau branch stabil
npm install
npm run dev
```

---

## 📞 Bantuan Lebih Lanjut

Jika masalah masih berlanjut:

1. **Cek log console** untuk error message yang spesifik
2. **Test dengan environment minimal** (tanpa WhatsApp bot)
3. **Validasi file konfigurasi** `.env` dan `data/config.json`
4. **Restart sistem** jika diperlukan

**Catatan**: Selalu backup data penting sebelum melakukan troubleshooting yang destruktif.