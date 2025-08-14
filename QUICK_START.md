# Quick Start Guide - MOOTERACT HUB

## 🚀 Instalasi Cepat

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Jalankan Backend**
   ```bash
   npm run start
   ```

3. **Jalankan WhatsApp Bot (Terminal Baru)**
   ```bash
   npm run start-bot
   ```

4. **Akses Website**
   - Website: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Login: `admin` / `admin123`

## 📱 Setup WhatsApp Bot

1. Bot akan otomatis mencoba connect saat dijalankan
2. Jika perlu scan QR code, akan muncul di terminal bot
3. Bot akan terhubung otomatis ke grup yang dikonfigurasi

## ⚙️ Konfigurasi

1. Edit file `.env` dengan konfigurasi Pterodactyl Anda
2. Atau ubah melalui Admin Panel → Konfigurasi  
3. Semua perubahan akan tersimpan di `data/config.json`

## 🔧 Admin Commands (WhatsApp)

```
!help          - Daftar perintah
!status        - Status sistem  
!stats         - Statistik detail
!requests      - Pending requests
!approve <id>  - Approve N8N request
!reject <id>   - Reject N8N request  
!broadcast <msg> - Broadcast ke grup
!restart       - Restart bot
```

## 📊 Fitur Admin Dashboard

- **Dashboard**: Overview statistik dengan real-time data
- **Template Server**: Konfigurasi Node.js & Python templates
- **Pengguna**: Management user & server mereka
- **Request N8N**: Approve/reject N8N server requests
- **Promosi**: Atur broadcast otomatis dengan scheduler
- **Konfigurasi**: Setting sistem lengkap

## 🎯 Workflow Claim Server

1. **User Access**: User masuk via http://localhost:3000
2. **Phone Verification**: Masukkan nomor WA → Terima OTP via WhatsApp
3. **Account Creation**: Buat akun dengan email & password
4. **Server Selection**: Pilih Node.js atau Python server
5. **Auto Provision**: Sistem otomatis buat server di Pterodactyl
6. **Notification**: Detail akun dikirim via WhatsApp

### 🔄 N8N Workflow
1. **Request**: User request N8N server via form
2. **Admin Review**: Request masuk ke dashboard admin
3. **WhatsApp Notification**: Admin terima notif di WhatsApp grup
4. **Decision**: Admin approve/reject via dashboard atau command
5. **Execution**: Jika approved, server otomatis dibuat

## 📈 Logging System

Aplikasi ini dilengkapi dengan comprehensive logging:

### Log Levels:
- `ℹ️ INFO`: Informasi umum operasi
- `✅ SUCCESS`: Operasi berhasil
- `⚠️ WARNING`: Peringatan yang perlu perhatian
- `❌ ERROR`: Error dengan detail lengkap
- `🐛 DEBUG`: Debug information
- `💬 MESSAGE`: WhatsApp message logs
- `⚡ COMMAND`: Admin command execution

### Real-time Monitoring:
- Semua operasi backend terekam dengan timestamp
- WhatsApp bot activity termonitor
- Admin actions tercatat lengkap
- Error tracking dengan stack trace

## 🔐 Security Notes

- ⚠️ **WAJIB**: Ubah password admin default (`admin123`)
- 🔑 **JANGAN**: Share API key Pterodactyl ke publik
- 🛡️ **PRODUCTION**: Gunakan HTTPS untuk production
- 🔒 **BACKUP**: Backup folder `data/` secara berkala
- 🚫 **ENVIRONMENT**: Jangan commit file `.env` ke repository

## 🐛 Troubleshooting

### Backend Tidak Start:
```bash
# Check logs di terminal
# Pastikan port 3000 tidak digunakan aplikasi lain
netstat -ano | findstr :3000

# Restart backend
npm run start
```

### WhatsApp Bot Error:
```bash
# Check config WhatsApp
cat data/config.json | grep -A 10 "whatsapp"

# Restart bot
npm run start-bot
```

### Admin Login Gagal:
- Pastikan menggunakan username: `admin`
- Pastikan menggunakan password: `admin123`
- Check console browser untuk error details

## 📞 Support

Jika mengalami masalah:
1. Check console logs (detailed error information)
2. Verify configuration di `data/config.json`
3. Restart both backend dan bot
4. Check network connectivity ke Pterodactyl panel

---
**Happy Coding! 🚀**

*Sistem ini dilengkapi dengan logging informatif yang memudahkan debugging dan monitoring.*
