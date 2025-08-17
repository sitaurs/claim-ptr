# 🚀 Konfigurasi Nginx Siap Pakai - claimpanel.flx.web.id

## 📋 Langkah Konfigurasi Final

### 1. Backup Konfigurasi Lama
```bash
sudo cp /etc/nginx/sites-available/claimpanel.flx.web.id /etc/nginx/sites-available/claimpanel.flx.web.id.backup
```

### 2. Edit Konfigurasi Nginx
```bash
sudo nano /etc/nginx/sites-available/claimpanel.flx.web.id
```

**Hapus semua isi file dan ganti dengan konfigurasi di bawah:**

```nginx
server {
    listen 443 ssl http2;
    server_name claimpanel.flx.web.id;

    # SSL Configuration (Certbot existing)
    ssl_certificate /etc/letsencrypt/live/claimpanel.flx.web.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/claimpanel.flx.web.id/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    server_tokens off;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # API Backend (Express port 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }

    # Admin Panel
    location /admin/ {
        proxy_pass http://127.0.0.1:3000/admin/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Bot API (WhatsApp Bot port 3001) - Optional External Access
    location /bot-api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Uncomment untuk restrict access hanya dari localhost:
        # allow 127.0.0.1;
        # deny all;
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_set_header Host $host;
        access_log off;
    }

    # Static Files (CSS, JS, Images)
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
    }

    # Main Application (Express + EJS)
    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Security - Block sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(env|log|sql|json)$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Block access to data directory
    location ~* ^/data/ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# HTTP to HTTPS Redirect
server {
    listen 80;
    server_name claimpanel.flx.web.id;
    return 301 https://$host$request_uri;
}
```

### 3. Test & Reload Nginx
```bash
# Test konfigurasi
sudo nginx -t

# Jika OK, reload Nginx
sudo systemctl reload nginx

# Cek status Nginx
sudo systemctl status nginx
```

### 4. Update Environment Variable
```bash
cd /var/www/claim-ptero

# Update BASE_URL di .env
sed -i 's|^BASE_URL=.*$|BASE_URL=https://claimpanel.flx.web.id|' .env

# Verify perubahan
grep BASE_URL .env
```

### 5. Restart PM2 Applications
```bash
# Restart backend dan bot
pm2 restart claim-ptero-backend
pm2 restart claim-ptero-bot

# Cek status
pm2 status

# Monitor logs
pm2 logs --lines 20
```

### 6. Verifikasi Deployment
```bash
# Test HTTPS redirect
curl -I http://claimpanel.flx.web.id
# Expected: 301 redirect to HTTPS

# Test main page
curl -I https://claimpanel.flx.web.id
# Expected: 200 OK

# Test admin panel
curl -I https://claimpanel.flx.web.id/admin
# Expected: 200 OK or 302 redirect to login

# Test API (jika ada route status)
curl -s https://claimpanel.flx.web.id/api/status || echo "API route may not exist"

# Test health check
curl -s https://claimpanel.flx.web.id/health
# Expected: health response or proxy to backend
```

### 7. Final Check
```bash
# Cek SSL certificate
openssl s_client -connect claimpanel.flx.web.id:443 -servername claimpanel.flx.web.id < /dev/null | grep "Verify return code"
# Expected: Verify return code: 0 (ok)

# Cek PM2 processes
pm2 list

# Cek Nginx error logs jika ada masalah
sudo tail -f /var/log/nginx/error.log
```

## 🎯 Akses Aplikasi

Setelah konfigurasi selesai:

- **Website Utama**: https://claimpanel.flx.web.id
- **Admin Panel**: https://claimpanel.flx.web.id/admin
  - Username: admin
  - Password: admin123 (ganti setelah login pertama)
- **API Endpoint**: https://claimpanel.flx.web.id/api/
- **Bot API** (jika dibutuhkan): https://claimpanel.flx.web.id/bot-api/

## 🔧 Troubleshooting

Jika ada masalah:

1. **Cek PM2 status**: `pm2 status`
2. **Cek logs**: `pm2 logs --lines 50`
3. **Cek Nginx logs**: `sudo tail -f /var/log/nginx/error.log`
4. **Restart services**: `pm2 restart all && sudo systemctl reload nginx`

## ✅ Done!

Aplikasi Claim Ptero sekarang dapat diakses melalui https://claimpanel.flx.web.id dengan SSL certificate yang sudah ada. Backend running di port 3000, WhatsApp bot di port 3001, semua di-proxy melalui Nginx dengan security headers dan optimasi yang proper.