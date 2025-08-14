require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const { initWhatsApp, sendMessage, sendOTP, sendAccountDetails, sendPromotion } = require('./bot');

console.log('🚀 Starting WhatsApp Bot Service...');

// Function untuk logging dengan timestamp
function botServiceLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [BOT-SERVICE][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

// Path konfigurasi yang benar
const configPath = path.join(__dirname, '..', 'data', 'config.json');

// Memastikan file konfigurasi ada
if (!fs.existsSync(configPath)) {
  botServiceLog('ERROR', 'Configuration file not found', { path: configPath });
  process.exit(1);
}

botServiceLog('SUCCESS', 'Loading config from:', { path: configPath });
let config;
try {
  config = fs.readJsonSync(configPath);
  botServiceLog('SUCCESS', 'Config loaded successfully');
  
  // Validasi struktur config
  if (!config.whatsapp) {
    botServiceLog('ERROR', 'Config.whatsapp not found in configuration file');
    botServiceLog('INFO', 'Creating default whatsapp config...');
    config.whatsapp = {
      group_id: "",
      auto_start: true,
      admin_commands: []
    };
    fs.writeJsonSync(configPath, config, { spaces: 2 });
    botServiceLog('SUCCESS', 'Default whatsapp config created');
  }
  
  botServiceLog('SUCCESS', 'WhatsApp config loaded', config.whatsapp);
} catch (error) {
  botServiceLog('ERROR', 'Error loading config', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}

// Inisialisasi Express untuk API bot
const app = express();
const PORT = process.env.BOT_PORT || 3001;

app.use(express.json());
botServiceLog('SUCCESS', 'Express middleware configured');

// API Endpoint untuk komunikasi dengan backend
app.post('/api/bot/send-message', async (req, res) => {
  botServiceLog('INFO', 'Received send-message request', req.body);
  
  try {
    const { to, message, adminKey } = req.body;
    
    if (adminKey !== config.server.admin_session_secret) {
      botServiceLog('WARNING', 'Unauthorized send-message request - invalid admin key');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    botServiceLog('INFO', `Sending message to: ${to}`);
    const success = await sendMessage(to, message);
    botServiceLog(success ? 'SUCCESS' : 'ERROR', `Message send result: ${success}`);
    res.json({ success });
  } catch (error) {
    botServiceLog('ERROR', 'Error in send-message', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/bot/send-otp', async (req, res) => {
  botServiceLog('INFO', 'Received send-otp request', req.body);
  
  try {
    const { to, otp, adminKey } = req.body;
    
    if (adminKey !== config.server.admin_session_secret) {
      botServiceLog('WARNING', 'Unauthorized send-otp request - invalid admin key');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    botServiceLog('INFO', `Sending OTP to: ${to}`);
    const success = await sendOTP(to, otp);
    botServiceLog(success ? 'SUCCESS' : 'ERROR', `OTP send result: ${success}`);
    res.json({ success });
  } catch (error) {
    botServiceLog('ERROR', 'Error in send-otp', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/bot/send-account-details', async (req, res) => {
  botServiceLog('INFO', 'Received send-account-details request', req.body);
  
  try {
    const { to, email, password, serverName, serverType, panelUrl, adminKey } = req.body;
    
    if (adminKey !== config.server.admin_session_secret) {
      botServiceLog('WARNING', 'Unauthorized send-account-details request - invalid admin key');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    botServiceLog('INFO', `Sending account details to: ${to}`, {
      email,
      serverName,
      serverType
    });
    const success = await sendAccountDetails(to, email, password, serverName, serverType, panelUrl);
    botServiceLog(success ? 'SUCCESS' : 'ERROR', `Account details send result: ${success}`);
    res.json({ success });
  } catch (error) {
    botServiceLog('ERROR', 'Error in send-account-details', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/bot/send-promotion', async (req, res) => {
  botServiceLog('INFO', 'Received send-promotion request', req.body);
  
  try {
    const { message, adminKey } = req.body;
    
    if (adminKey !== config.server.admin_session_secret) {
      botServiceLog('WARNING', 'Unauthorized promotion request - invalid admin key');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    botServiceLog('INFO', `Sending promotion to group: ${config.whatsapp.group_id}`);
    const success = await sendPromotion(config.whatsapp.group_id, message);
    botServiceLog(success ? 'SUCCESS' : 'ERROR', `Promotion send result: ${success}`);
    res.json({ success });
  } catch (error) {
    botServiceLog('ERROR', 'Error in send-promotion', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// API untuk menjalankan perintah admin dari backend
app.post('/api/bot/admin-command', async (req, res) => {
  botServiceLog('INFO', 'Received admin-command request', req.body);
  
  try {
    const { command, params, adminKey } = req.body;
    
    if (adminKey !== config.server.admin_session_secret) {
      botServiceLog('WARNING', 'Unauthorized admin-command request - invalid admin key');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    botServiceLog('INFO', `Processing admin command: ${command}`, params);
    let response = { success: false, message: 'Unknown command' };
    
    switch (command) {
      case '!status':
        response = { success: true, message: 'Bot is running', status: 'online' };
        break;
      case '!broadcast':
        if (params && params.message) {
          const success = await sendPromotion(config.whatsapp.group_id, params.message);
          response = { success, message: success ? 'Broadcast sent' : 'Failed to send broadcast' };
        } else {
          response = { success: false, message: 'Message parameter is required' };
        }
        break;
      case '!restart':
        response = { success: true, message: 'Bot restart initiated' };
        setTimeout(() => {
          botServiceLog('INFO', 'Restarting bot process...');
          process.exit(0);
        }, 1000);
        break;
      default:
        response = { success: false, message: `Unknown command: ${command}` };
    }
    
    botServiceLog('SUCCESS', `Admin command executed: ${command}`, response);
    res.json(response);
  } catch (error) {
    botServiceLog('ERROR', 'Error in admin-command', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start Express server untuk API bot
app.listen(PORT, () => {
  botServiceLog('SUCCESS', `🌐 WhatsApp Bot API running at http://localhost:${PORT}`);
});

// Inisialisasi WhatsApp bot jika auto_start diaktifkan
if (config.whatsapp && config.whatsapp.auto_start) {
  botServiceLog('INFO', 'Auto-start enabled, initializing WhatsApp Bot...');
  initWhatsApp().catch(err => {
    botServiceLog('ERROR', 'Failed to initialize WhatsApp Bot', {
      error: err.message,
      stack: err.stack
    });
  });
} else {
  botServiceLog('INFO', 'Auto-start disabled, WhatsApp Bot not started automatically');
}
