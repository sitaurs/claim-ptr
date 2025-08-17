# 🚀 Panduan Deployment VPS - Claim Ptero

Panduan lengkap untuk deploy aplikasi Claim Ptero ke VPS dengan Nginx, SSL, dan optimasi production.

## 📋 Prasyarat

- **VPS**: Ubuntu 20.04/22.04 dengan minimal 1GB RAM
- **Domain**: Domain yang sudah A record ke IP VPS Anda
- **Panel Pterodactyl**: Panel yang sudah running dan accessible
- **WhatsApp**: Nomor WhatsApp untuk bot (bisa pakai nomor pribadi)

## 🛠️ Step 1: Persiapan VPS

### Update Sistem & Install Dependencies

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install curl, git, dan tools dasar
sudo apt install curl git wget unzip software-properties-common -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi instalasi
node --version  # Output: v18.x.x
npm --version   # Output: 9.x.x

# Install PM2 untuk process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot untuk SSL certificate
sudo apt install certbot python3-certbot-nginx -y

# Install UFW untuk firewall
sudo apt install ufw -y
```

## 🗂️ Step 2: Setup Project

### Clone & Setup Application

```bash
# Masuk ke directory web
cd /var/www

# Clone project (ganti dengan URL repo Anda)
sudo git clone https://github.com/username/claim-ptero.git claim-ptero

# Set ownership ke user Anda
sudo chown -R $USER:$USER /var/www/claim-ptero

# Masuk ke directory project
cd claim-ptero

# Install dependencies production
npm ci --production

# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### Konfigurasi Environment (.env)

```bash
# === SERVER CONFIGURATION ===
PORT=3000
BASE_URL=https://domain-anda.com
NODE_ENV=production

# === PTERODACTYL PANEL ===
PANEL_URL=https://panel.domain-anda.com
API_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# === SECURITY ===
ADMIN_SESSION_SECRET=ganti-dengan-secret-yang-sangat-kuat-dan-acak

# === WHATSAPP BOT ===
WHATSAPP_GROUP_ID=120363000000000000
ADMIN_NUMBERS=6281234567890,6289876543210
BOT_PORT=3001

# === TESTING (Optional) ===
DUMMY_TEST_NUMBERS=6280000000001,6280000000002
```

**⚠️ PENTING**: 
- Ganti `ADMIN_SESSION_SECRET` dengan string random yang kuat (minimal 32 karakter)
- Pastikan `PANEL_URL` dan `API_KEY` benar
- `WHATSAPP_GROUP_ID` bisa dikosongkan dulu, akan diisi setelah bot running

## 🔧 Step 3: Setup PM2 Process Manager

### Buat File Konfigurasi PM2

```bash
# Buat ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'claim-ptero-backend',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'claim-ptero-bot',
      script: 'whatsapp/start-bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      args: '--force-start',
      env: {
        NODE_ENV: 'production',
        BOT_PORT: 3001
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    }
  ]
};
EOF

# Buat directory logs
mkdir -p logs

# Start aplikasi dengan PM2
pm2 start ecosystem.config.js

# Setup PM2 untuk auto-start saat server reboot
pm2 startup
# Ikuti instruksi yang muncul (copy-paste command yang diberikan)

# Save PM2 process list
pm2 save

# Cek status aplikasi
pm2 status
pm2 logs claim-ptero-backend --lines 50
pm2 logs claim-ptero-bot --lines 50
```

## 🌐 Step 4: Konfigurasi Nginx

### Buat File Konfigurasi Nginx

```bash
# Backup konfigurasi default
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Buat konfigurasi untuk domain Anda
sudo nano /etc/nginx/sites-available/claim-ptero
```

**Paste konfigurasi berikut** (ganti `domain-anda.com` dengan domain Anda):

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

# Upstream servers
upstream claim_ptero_backend {
    server 127.0.0.1:3000 fail_timeout=30s max_fails=3;
}

upstream claim_ptero_bot {
    server 127.0.0.1:3001 fail_timeout=30s max_fails=3;
}

server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;
    
    # Redirect HTTP ke HTTPS (akan dikonfigurasi setelah SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domain-anda.com www.domain-anda.com;
    
    # SSL configuration (akan diisi otomatis oleh certbot)
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Hide Nginx version
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static files with caching
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/claim-ptero/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        access_log off;
        
        # Fallback ke aplikasi jika file tidak ditemukan
        try_files $uri @backend;
    }
    
    # API endpoints dengan rate limiting
    location /api/ {
        limit_req zone=api burst=5 nodelay;
        limit_req_status 429;
        
        proxy_pass http://claim_ptero_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }
    
    # Admin panel dengan rate limiting
    location /admin/ {
        limit_req zone=general burst=10 nodelay;
        
        proxy_pass http://claim_ptero_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Bot API (internal only, uncomment jika perlu akses eksternal)
    # location /bot-api/ {
    #     allow 127.0.0.1;
    #     deny all;
    #     
    #     proxy_pass http://claim_ptero_bot/;
    #     proxy_http_version 1.1;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }
    
    # Main application
    location @backend {
        limit_req zone=general burst=20 nodelay;
        
        proxy_pass http://claim_ptero_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Root location
    location / {
        try_files $uri @backend;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~* \.(env|log|sql)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Enable Site & Test Konfigurasi

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/claim-ptero /etc/nginx/sites-enabled/

# Disable default site
sudo rm /etc/nginx/sites-enabled/default

# Test konfigurasi Nginx
sudo nginx -t

# Jika OK, reload Nginx
sudo systemctl reload nginx

# Enable Nginx untuk auto-start
sudo systemctl enable nginx
```

## 🔒 Step 5: Setup SSL dengan Certbot

### Generate SSL Certificate

```bash
# Stop Nginx sementara untuk initial certificate
sudo systemctl stop nginx

# Generate SSL certificate
sudo certbot certonly --standalone -d domain-anda.com -d www.domain-anda.com

# Start Nginx kembali
sudo systemctl start nginx

# Atau gunakan nginx plugin (jika nginx sudah running)
# sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

### Setup Auto-Renewal

```bash
# Enable dan start certbot timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Cek status timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Manual renewal jika diperlukan
# sudo certbot renew && sudo systemctl reload nginx
```

## 🔥 Step 6: Setup Firewall

### Konfigurasi UFW

```bash
# Reset UFW
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (sesuaikan port jika custom)
sudo ufw allow ssh
# Atau jika custom port: sudo ufw allow 2222/tcp

# Allow HTTP dan HTTPS
sudo ufw allow 'Nginx Full'

# Allow specific IPs for admin access (optional)
# sudo ufw allow from YOUR_IP_ADDRESS to any port 22

# Enable firewall
sudo ufw --force enable

# Cek status
sudo ufw status verbose
```

## 📱 Step 7: Setup WhatsApp Bot

### Scan QR Code

```bash
# Monitor log bot untuk QR code
pm2 logs claim-ptero-bot --lines 50

# Atau gunakan tail untuk real-time
tail -f /var/www/claim-ptero/logs/bot-out.log
```

1. **Scan QR code** yang muncul di log dengan WhatsApp Anda
2. **Tunggu** hingga bot berhasil terhubung (muncul pesan "Bot connected")
3. **Test bot** dengan mengirim pesan ke nomor yang digunakan

### Konfigurasi Group ID (Optional)

```bash
# Jika ingin notifikasi ke group, dapatkan Group ID
# 1. Invite bot ke group WhatsApp
# 2. Kirim pesan di group
# 3. Cek log untuk mendapatkan Group ID
pm2 logs claim-ptero-bot | grep "g.us"

# Update .env dengan Group ID
nano /var/www/claim-ptero/.env
# Tambahkan: WHATSAPP_GROUP_ID=120363000000000000@g.us

# Restart bot
pm2 restart claim-ptero-bot
```

## ✅ Step 8: Verifikasi Deployment

### Test Aplikasi

```bash
# Cek status PM2
pm2 status

# Cek logs
pm2 logs --lines 20

# Test HTTP endpoints
curl -I http://domain-anda.com  # Should redirect to HTTPS
curl -I https://domain-anda.com  # Should return 200 OK
curl https://domain-anda.com/health  # Should return "healthy"

# Test API
curl https://domain-anda.com/api/status

# Cek SSL
openssl s_client -connect domain-anda.com:443 -servername domain-anda.com < /dev/null
```

### Akses Website

1. **Frontend**: https://domain-anda.com
2. **Admin Panel**: https://domain-anda.com/admin
   - Username: admin
   - Password: admin123 (ganti setelah login pertama)

## 🔄 Step 9: Maintenance Scripts

### Buat Script Backup

```bash
# Buat script backup
sudo nano /usr/local/bin/backup-claim-ptero.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/claim-ptero"
APP_DIR="/var/www/claim-ptero"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application data
tar -czf $BACKUP_DIR/claim-ptero-data-$DATE.tar.gz \
    $APP_DIR/data/ \
    $APP_DIR/.env \
    $APP_DIR/whatsapp/auth/ \
    2>/dev/null

# Backup nginx config
cp /etc/nginx/sites-available/claim-ptero $BACKUP_DIR/nginx-config-$DATE.conf

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.conf" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/claim-ptero-data-$DATE.tar.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-claim-ptero.sh

# Setup cron untuk backup harian
sudo crontab -e
# Tambahkan: 0 2 * * * /usr/local/bin/backup-claim-ptero.sh >/dev/null 2>&1
```

### Script Update

```bash
# Buat script update
nano /var/www/claim-ptero/update.sh
```

```bash
#!/bin/bash
cd /var/www/claim-ptero

echo "Stopping applications..."
pm2 stop all

echo "Backing up current version..."
cp .env .env.backup

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm ci --production

echo "Starting applications..."
pm2 start ecosystem.config.js

echo "Waiting for applications to start..."
sleep 10

echo "Checking status..."
pm2 status

echo "Update completed!"
```

```bash
chmod +x update.sh
```

## 📊 Step 10: Monitoring & Logs

### Setup Log Rotation

```bash
# Buat konfigurasi logrotate
sudo nano /etc/logrotate.d/claim-ptero
```

```
/var/www/claim-ptero/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Monitoring Commands

```bash
# Monitor aplikasi
pm2 monit

# Real-time logs
pm2 logs --lines 100

# System resources
htop
df -h
free -h

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# SSL certificate info
sudo certbot certificates
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 3000/3001 sudah digunakan**:
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo kill -9 <PID>
   ```

2. **Nginx 502 Bad Gateway**:
   ```bash
   pm2 status  # Pastikan aplikasi running
   sudo nginx -t  # Test config
   pm2 logs --lines 50  # Cek error logs
   ```

3. **SSL Certificate gagal**:
   ```bash
   sudo certbot certificates  # Cek status
   sudo ufw status  # Pastikan port 80/443 open
   dig domain-anda.com  # Verifikasi DNS
   ```

4. **WhatsApp bot tidak connect**:
   ```bash
   pm2 logs claim-ptero-bot  # Cek QR code
   rm -rf whatsapp/auth/*  # Reset auth
   pm2 restart claim-ptero-bot
   ```

5. **High memory usage**:
   ```bash
   pm2 reload all  # Reload tanpa downtime
   # Atau adjust max_memory_restart di ecosystem.config.js
   ```

### Performance Optimization

```bash
# Enable Nginx caching (optional)
sudo nano /etc/nginx/nginx.conf
# Tambahkan di http block:
# proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app:10m inactive=60m;

# Optimize PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor performance
pm2 install pm2-server-monit
```

## ✅ Final Checklist

- [ ] VPS updated dan dependencies installed
- [ ] Project cloned dan configured
- [ ] Environment variables configured
- [ ] PM2 running both backend dan bot
- [ ] Nginx configured dan SSL enabled
- [ ] Firewall configured
- [ ] WhatsApp bot connected
- [ ] Website accessible via HTTPS
- [ ] Admin panel accessible
- [ ] Backup script created
- [ ] Monitoring setup

**🎉 Selamat! Aplikasi Claim Ptero sudah berhasil di-deploy di VPS dengan SSL dan siap production!**

---

## 📞 Bantuan

Jika mengalami masalah:
1. Cek [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
2. Review logs: `pm2 logs`
3. Verifikasi konfigurasi: `sudo nginx -t`
4. Test connectivity: `curl -I https://domain-anda.com`