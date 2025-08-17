# 🔧 Fix Login Admin - Production dengan Nginx

## 🎯 Masalah
Admin login berhasil di backend (log menunjukkan "Login berhasil") tetapi tidak redirect ke dashboard, tetap di halaman login.

## 🔍 Penyebab
Aplikasi di balik Nginx reverse proxy tanpa `trust proxy` setting, sehingga:
- Express session `secure: true` untuk production tidak bekerja dengan benar
- Cookie session tidak tersimpan di browser
- User tetap tidak ter-autentikasi

## ✅ Solusi yang Sudah Diterapkan

### 1. **Trust Proxy Setting** ([`index.js`](index.js:151-155))
```javascript
// Trust proxy untuk production (di balik Nginx/reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  log('INFO', 'Trust proxy enabled for production');
}
```

### 2. **Enhanced Cookie Settings** ([`middleware/auth.js`](middleware/auth.js:26-30))
```javascript
cookie: { 
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 jam
}
```

## 🚀 Deploy Fix

### 1. Restart Backend
```bash
cd /root/claim-ptr
pm2 restart claim-ptero-backend

# Monitor logs
pm2 logs claim-ptero-backend --lines 20
```

### 2. Set NODE_ENV Production
```bash
# Update .env file
echo "NODE_ENV=production" >> .env

# Restart lagi
pm2 restart claim-ptero-backend
```

### 3. Test Login Admin
```bash
# Akses admin panel
curl -I https://claimpanel.flx.web.id/admin

# Test login (browser)
# Username: admin
# Password: admin123
```

## 🔍 Debugging Additional

Jika masih gagal, cek:

### 1. Headers dari Browser
```bash
# Cek response headers
curl -v https://claimpanel.flx.web.id/admin
```

### 2. Cookie Debug
Tambahkan temporary log di [`middleware/auth.js`](middleware/auth.js:46):
```javascript
const adminLogin = async (req, res, next) => {
  console.log('DEBUG: Request headers:', req.headers);
  console.log('DEBUG: Session before:', req.session);
  // ... existing code
  if (result.valid) {
    req.session.adminId = result.admin.id;
    req.session.adminUsername = result.admin.username;
    console.log('DEBUG: Session after:', req.session);
    // ... existing code
  }
}
```

### 3. Alternative Cookie Settings
Jika masih gagal, edit [`middleware/auth.js`](middleware/auth.js:26-30):
```javascript
cookie: { 
  secure: false, // Force false untuk testing
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
}
```

## 📋 Checklist Verifikasi

- [ ] `pm2 restart claim-ptero-backend` executed
- [ ] `NODE_ENV=production` set di `.env`
- [ ] Browser cleared cache/cookies
- [ ] Admin login test: `admin` / `admin123`
- [ ] Redirect ke `/admin/dashboard` berhasil

## 🎉 Expected Result

Setelah fix:
1. Login admin berhasil
2. Redirect otomatis ke dashboard
3. Session tersimpan dengan benar
4. Admin dapat akses semua halaman admin

---

**Root cause**: Express di balik reverse proxy membutuhkan `trust proxy` setting agar session cookies bekerja dengan header `X-Forwarded-Proto` dari Nginx.