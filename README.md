# 🚀 Claim Ptero - WhatsApp Server Auto Claim

Sistem otomatis untuk klaim server Pterodactyl dengan verifikasi WhatsApp. User dapat mengklaim server gratis melalui website dengan verifikasi OTP via WhatsApp bot.

## 📋 Fitur Utama

- ✅ **Auto Claim Server**: Klaim server Pterodactyl otomatis
- 📱 **WhatsApp Integration**: Verifikasi OTP via WhatsApp bot
- 🔐 **Admin Panel**: Dashboard admin untuk manage user & server
- 🎨 **Modern UI**: Interface yang user-friendly dengan Tailwind CSS
- 📊 **Analytics**: Tracking request dan statistics
- 🔄 **Real-time Updates**: Notifikasi real-time ke group WhatsApp
- 🧪 **Testing Support**: Dummy numbers untuk testing

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS, Tailwind CSS
- **Database**: JSON file-based storage
- **WhatsApp**: Baileys WebSocket
- **API Integration**: Pterodactyl Panel API
- **Testing**: Jest, Playwright

## 📦 Instalasi & Setup

### Prasyarat
- Node.js 18.x atau lebih baru
- VPS dengan Ubuntu 20.04/22.04
- Domain yang sudah A record ke IP VPS
- Panel Pterodactyl yang sudah running

### 🔧 Local Development

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd claim-ptero
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp env.example .env
   # Edit .env sesuai konfigurasi Anda
   ```

4. **Jalankan Development**
   ```bash
   # Terminal 1: Backend
   npm run dev
   
   # Terminal 2: WhatsApp Bot
   npm run dev-bot
   ```

5. **Akses Aplikasi**
   - Website: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Login: admin / admin123

### 🌐 Production Deployment (VPS + Nginx + SSL)

#### 1. Persiapan VPS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 untuk process manager
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot untuk SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. Setup Project

```bash
# Clone project
cd /var/www
sudo git clone <repository-url> claim-ptero
sudo chown -R $USER:$USER /var/www/claim-ptero
cd claim-ptero

# Install dependencies
npm install --production

# Setup environment
cp env.example .env
nano .env
```

#### 3. Konfigurasi Environment (.env)

```bash
# Server Configuration
PORT=3000
BASE_URL=https://yourdomain.com

# Pterodactyl Panel Configuration
PANEL_URL=https://panel.yourdomain.com
API_KEY=your_pterodactyl_api_key

# Admin Configuration
ADMIN_SESSION_SECRET=your-super-secret-key

# WhatsApp Bot Configuration
WHATSAPP_GROUP_ID=your_group_id
ADMIN_NUMBERS=6281234567890,6289876543210

# Bot API (untuk production pisahkan port)
BOT_PORT=3001

# Dummy test numbers (optional)
DUMMY_TEST_NUMBERS=6280000000001,6280000000002
```

#### 4. Setup PM2

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
      }
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
      }
    }
  ]
};
EOF

# Start aplikasi dengan PM2
pm2 start ecosystem.config.js

# Setup auto-start saat boot
pm2 startup
pm2 save
```

#### 5. Konfigurasi Nginx

```bash
# Buat file konfigurasi Nginx
sudo nano /etc/nginx/sites-available/claim-ptero
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Static files
    location /css/ {
        alias /var/www/claim-ptero/public/css/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /var/www/claim-ptero/public/js/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /img/ {
        alias /var/www/claim-ptero/public/img/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Main application
    location / {
        proxy_pass http://127.0.0.1:3000;
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

    # WhatsApp Bot API (optional, jika ingin expose)
    location /bot-api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Restrict access (optional)
        # allow 127.0.0.1;
        # deny all;
    }

    # Rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Tambahkan rate limiting di nginx.conf
sudo nano /etc/nginx/nginx.conf
```

Tambahkan di dalam `http` block:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;
```

```bash
# Enable site dan test konfigurasi
sudo ln -s /etc/nginx/sites-available/claim-ptero /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Setup SSL dengan Certbot

```bash
# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

#### 7. Setup Firewall

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

#### 8. WhatsApp Bot Setup

1. **Akses server dan scan QR code**:
   ```bash
   pm2 logs claim-ptero-bot
   ```

2. **Scan QR code** yang muncul dengan WhatsApp Anda

3. **Verifikasi bot berjalan**:
   ```bash
   pm2 status
   curl https://yourdomain.com/api/status
   ```

## 🔧 Konfigurasi

### Environment Variables (.env)

```bash
# Server
PORT=3000
BASE_URL=https://yourdomain.com

# Pterodactyl Panel
PANEL_URL=https://panel.yourdomain.com
API_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxx

# Security
ADMIN_SESSION_SECRET=super-secret-key-change-this

# WhatsApp
WHATSAPP_GROUP_ID=120363000000000000
ADMIN_NUMBERS=6281234567890,6289876543210
BOT_PORT=3001

# Testing (optional)
DUMMY_TEST_NUMBERS=6280000000001
```

### Server Templates (data/config.json)

Project sudah include template default untuk:
- **Node.js**: Egg 16, Memory 512MB, Disk 1GB
- **Python**: Egg 17, Memory 1GB, Disk 2GB

## 📱 Cara Penggunaan

### User Flow
1. Kunjungi website: `https://yourdomain.com`
2. Isi form klaim server (nama, email, whatsapp, tipe server)
3. Verifikasi OTP yang dikirim via WhatsApp bot
4. Server otomatis dibuat di panel Pterodactyl
5. Detail login dikirim via WhatsApp

### Admin Panel
1. Akses: `https://yourdomain.com/admin`
2. Login: admin / admin123 (ganti setelah login pertama)
3. Kelola users, servers, requests, dan konfigurasi

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test dengan UI
npm run test:e2e:ui
```

## 🔧 Maintenance

### Monitoring dengan PM2
```bash
# Status aplikasi
pm2 status

# Logs
pm2 logs claim-ptero-backend
pm2 logs claim-ptero-bot

# Restart aplikasi
pm2 restart all

# Update aplikasi
cd /var/www/claim-ptero
git pull
npm install --production
pm2 restart all
```

### Backup Data
```bash
# Backup data penting
sudo tar -czf /backup/claim-ptero-$(date +%Y%m%d).tar.gz \
    /var/www/claim-ptero/data/ \
    /var/www/claim-ptero/.env \
    /var/www/claim-ptero/whatsapp/auth/
```

### SSL Certificate Renewal
```bash
# Manual renewal
sudo certbot renew

# Check auto-renewal
sudo systemctl status certbot.timer
```

## 🐛 Troubleshooting

Lihat panduan lengkap di [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)

### Common Issues

1. **Server restart berulang**: Gunakan `nodemon.json` yang sudah disediakan
2. **Admin numbers tidak terbaca**: Pastikan `ADMIN_NUMBERS` di `.env`
3. **WhatsApp bot disconnect**: Restart bot dan scan ulang QR
4. **SSL error**: Pastikan domain sudah A record dan port 80/443 terbuka

## 📚 Documentation

- [`PANDUAN_LOCAL.md`](PANDUAN_LOCAL.md) - Setup development lokal
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) - Panduan troubleshooting
- [`env.example`](env.example) - Template environment variables

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - lihat file LICENSE untuk detail lengkap.

## 🆘 Support

Jika mengalami masalah:
1. Cek [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
2. Lihat logs PM2: `pm2 logs`
3. Test dengan environment minimal
4. Buat issue di repository ini

---

**Dibuat dengan ❤️ untuk komunitas hosting gratis**