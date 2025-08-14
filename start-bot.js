require('dotenv').config();
const fs = require('fs-extra');
const express = require('express');
const { initWhatsApp, sendMessage, sendOTP, sendAccountDetails, sendPromotion } = require('./whatsapp/bot');

// Memastikan file konfigurasi ada
if (!fs.existsSync('./data/config.json')) {
  console.error('File konfigurasi tidak ditemukan!');
  process.exit(1);
}

const config = fs.readJsonSync('./data/config.json');

// Inisialisasi Express untuk API bot
const app = express();
const PORT = process.env.BOT_PORT || 3001;

app.use(express.json());

// API Endpoint untuk komunikasi dengan backend
app.post('/api/bot/send-message', async (req, res) => {
  const { to, message, adminKey } = req.body;
  
  // Validasi admin key untuk keamanan
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const success = await sendMessage(to, message);
  res.json({ success });
});

app.post('/api/bot/send-otp', async (req, res) => {
  const { to, otp, adminKey } = req.body;
  
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const success = await sendOTP(to, otp);
  res.json({ success });
});

app.post('/api/bot/send-account', async (req, res) => {
  const { to, email, password, serverName, serverType, panelUrl, adminKey } = req.body;
  
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const success = await sendAccountDetails(to, email, password, serverName, serverType, panelUrl);
  res.json({ success });
});

app.post('/api/bot/send-promotion', async (req, res) => {
  const { message, adminKey } = req.body;
  
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const success = await sendPromotion(config.whatsapp.group_id, message);
  res.json({ success });
});

// Endpoint untuk notifikasi JSON request
app.post('/api/bot/notify-json-request', async (req, res) => {
  const { request, adminKey } = req.body;
  
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const message = `*MOOTERACT HUB - Request N8n Baru*\n\nAda permintaan server N8n baru:\n\nNama: ${request.name}\nEmail: ${request.email}\nTelepon: ${request.phoneNumber}\nAlasan: ${request.reason || 'Tidak ada alasan'}\n\nSilahkan cek dashboard admin untuk detail lebih lanjut.`;
  
  const success = await sendMessage(config.whatsapp.group_id, message);
  res.json({ success });
});

// Admin commands handler
app.post('/api/bot/admin-command', async (req, res) => {
  const { command, params, adminKey } = req.body;
  
  if (adminKey !== config.server.admin_session_secret) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  // Handle admin commands
  let response = { success: false, message: 'Command not found' };
  
  switch (command) {
    case '!status':
      try {
        const users = await fs.readJson('./data/users.json').catch(() => []);
        const servers = await fs.readJson('./data/servers.json').catch(() => []);
        const n8nRequests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
        
        response = { 
          success: true, 
          message: `*MOOTERACT HUB Status*\n\nBot: Online ✅\nTotal Users: ${users.length}\nTotal Servers: ${servers.length}\nN8n Requests: ${n8nRequests.filter(r => r.status === 'pending').length} pending`,
          status: 'online' 
        };
      } catch (error) {
        response = { success: false, message: 'Error getting status' };
      }
      break;
      
    case '!broadcast':
      if (params && params.message) {
        const success = await sendPromotion(config.whatsapp.group_id, params.message);
        response = { success, message: success ? 'Broadcast sent' : 'Failed to send broadcast' };
      } else {
        response = { success: false, message: 'Message parameter is required' };
      }
      break;
      
    case '!help':
      const helpMessage = `*MOOTERACT HUB - Admin Commands*\n\n!status - Cek status bot dan statistik\n!broadcast <pesan> - Kirim broadcast ke grup\n!users - Lihat jumlah pengguna\n!servers - Lihat jumlah server\n!requests - Lihat permintaan N8n pending\n!restart - Restart bot\n!help - Tampilkan bantuan ini`;
      response = { success: true, message: helpMessage };
      break;
      
    case '!users':
      try {
        const users = await fs.readJson('./data/users.json').catch(() => []);
        response = { success: true, message: `Total pengguna terdaftar: ${users.length}` };
      } catch (error) {
        response = { success: false, message: 'Error getting users data' };
      }
      break;
      
    case '!servers':
      try {
        const servers = await fs.readJson('./data/servers.json').catch(() => []);
        const nodeCount = servers.filter(s => s.type === 'nodejs').length;
        const pythonCount = servers.filter(s => s.type === 'python').length;
        response = { 
          success: true, 
          message: `*Server Statistics*\n\nTotal: ${servers.length}\nNode.js: ${nodeCount}\nPython: ${pythonCount}` 
        };
      } catch (error) {
        response = { success: false, message: 'Error getting servers data' };
      }
      break;
      
    case '!requests':
      try {
        const requests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
        const pending = requests.filter(r => r.status === 'pending');
        if (pending.length === 0) {
          response = { success: true, message: 'Tidak ada permintaan N8n yang pending' };
        } else {
          let message = `*Permintaan N8n Pending (${pending.length})*\n\n`;
          pending.slice(0, 5).forEach((req, i) => {
            message += `${i+1}. ${req.name} (${req.email})\n`;
          });
          if (pending.length > 5) {
            message += `\n...dan ${pending.length - 5} lainnya`;
          }
          response = { success: true, message };
        }
      } catch (error) {
        response = { success: false, message: 'Error getting requests data' };
      }
      break;
      
    case '!restart':
      response = { success: true, message: 'Bot restart initiated...' };
      setTimeout(() => {
        process.exit(0);
      }, 1000);
      break;
      
    default:
      if (config.whatsapp.admin_commands && config.whatsapp.admin_commands.includes(command)) {
        response = { success: true, message: `Command ${command} recognized but not implemented` };
      }
  }
  
  res.json(response);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mulai server API
app.listen(PORT, () => {
  console.log(`WhatsApp Bot API berjalan di http://localhost:${PORT}`);
});

// Inisialisasi WhatsApp bot jika auto_start diaktifkan
if (config.whatsapp.auto_start) {
  console.log('Memulai WhatsApp Bot...');
  initWhatsApp().catch(err => {
    console.error('Gagal menginisialisasi WhatsApp Bot:', err);
  });
} else {
  console.log('WhatsApp Bot tidak dijalankan otomatis. Set whatsapp.auto_start = true di config untuk mengaktifkan.');
}
