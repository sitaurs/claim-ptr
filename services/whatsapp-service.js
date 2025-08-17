require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Function untuk logging dengan timestamp
function whatsappServiceLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅', 
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [WHATSAPP-SERVICE][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

const CONFIG_PATH = path.join(__dirname, '../data/config.json');

function getConfig() {
  try {
    const config = fs.readJsonSync(CONFIG_PATH);
    whatsappServiceLog('DEBUG', 'Config loaded successfully');
    return config;
  } catch (error) {
    whatsappServiceLog('ERROR', 'Error reading config, using defaults', { error: error.message });
    return {
      bot_url: 'http://localhost:3001',
      server: { admin_session_secret: 'default-secret' },
      whatsapp: { group_id: '' }
    };
  }
}

function getBotUrl() {
  const config = getConfig();
  const baseUrl = process.env.BOT_API_URL || config.bot_url || 'http://localhost:3001';
  const url = baseUrl.replace(/\/+$/, '') + '/api/bot';
  whatsappServiceLog('DEBUG', `Bot URL: ${url}`);
  return url;
}

function getAdminKey() {
  const key = process.env.ADMIN_SESSION_SECRET || 'default-secret';
  whatsappServiceLog('DEBUG', 'Admin key retrieved from env');
  return key;
}

function getAdminNumbers() {
  let admins = [];
  
  // Ambil langsung dari environment variable .env
  if (process.env.ADMIN_NUMBERS) {
    const envAdmins = process.env.ADMIN_NUMBERS.split(',').map(num => num.trim());
    admins.push(...envAdmins);
    whatsappServiceLog('DEBUG', 'Admin numbers loaded from .env', { envAdmins });
  }
  
  // Remove empty and duplicates
  admins = [...new Set(admins.filter(Boolean))];
  const formattedAdmins = admins.map(num => formatWhatsAppNumber(num));
  
  whatsappServiceLog('DEBUG', 'Final admin numbers', {
    raw: admins,
    formatted: formattedAdmins
  });
  
  return formattedAdmins;
}

async function sendToAdmins(message) {
  const admins = getAdminNumbers();
  if (admins.length === 0) {
    whatsappServiceLog('WARNING', 'No admin_numbers configured, skipping admin notify');
    return { success: false, message: 'No admin numbers' };
  }
  let allOk = true;
  for (const admin of admins) {
    const res = await sendMessage(admin, message);
    allOk = allOk && res.success;
  }
  return { success: allOk };
}

// Format nomor WhatsApp sesuai Baileys
function formatWhatsAppNumber(number) {
  // Hapus karakter non-digit
  number = number.replace(/\D/g, '');
  
  // Hapus leading zero dan ganti dengan 62
  if (number.startsWith('0')) {
    number = '62' + number.substring(1);
  }
  
  // Tambahkan +62 jika belum ada
  if (!number.startsWith('62')) {
    number = '62' + number;
  }
  
  return number + '@s.whatsapp.net';
}

// Format group ID untuk WhatsApp
function formatGroupId(groupId) {
  if (!groupId) return null;
  
  // Jika sudah dalam format yang benar
  if (groupId.includes('@g.us')) {
    return groupId;
  }
  
  // Tambahkan @g.us jika belum ada
  return groupId + '@g.us';
}

// Cek status bot - prioritas ke global socket jika ada, fallback ke API
async function checkBotStatus() {
  whatsappServiceLog('INFO', 'Checking bot status...');
  
  try {
    // Cek global socket terlebih dahulu (jika bot berjalan di proses yang sama)
    if (global.whatsappSocket?.user) {
      whatsappServiceLog('SUCCESS', 'Bot connected via global socket');
      return { 
        connected: true, 
        ready: true,
        online: true,
        user: global.whatsappSocket.user,
        source: 'global_socket'
      };
    }
    
    // Fallback ke API bot jika terpisah
    const { data } = await axios.get(`${getBotUrl()}/status`, { timeout: 5000 });
    whatsappServiceLog('SUCCESS', 'Bot status retrieved via API', data);
    return { 
      connected: data.success && data.online, 
      ready: data.ready,
      online: data.online,
      ...data,
      source: 'api'
    };
    
  } catch (error) {
    whatsappServiceLog('ERROR', 'Bot status check failed', { error: error.message });
    return { 
      connected: false, 
      ready: false,
      online: false,
      message: error.message,
      error: 'Bot tidak dapat dijangkau',
      source: 'error'
    };
  }
}

// Kirim pesan WhatsApp - prioritas ke global socket, fallback ke API
async function sendMessage(to, text, mentions = null) {
  whatsappServiceLog('INFO', `Sending message to: ${to}`);
  
  try {
    // Format nomor dengan benar
    let formattedTo = to;
    if (!formattedTo.endsWith('@g.us')) {
      formattedTo = formatWhatsAppNumber(to);
    }
    
    // Cek status bot terlebih dahulu
    const botStatus = await checkBotStatus();
    if (!botStatus.connected) {
      whatsappServiceLog('ERROR', 'Bot not connected, cannot send message', { status: botStatus });
      return { 
        success: false, 
        connected: false,
        message: 'WhatsApp bot tidak terhubung',
        botStatus
      };
    }
    
    // Gunakan global socket jika ada
    if (global.whatsappSocket?.user) {
      try {
        const { sendMessage: botSendMessage } = require('../whatsapp/bot');
        const result = await botSendMessage(formattedTo, text, mentions);
        
        whatsappServiceLog(result ? 'SUCCESS' : 'ERROR', `Message sent via global socket: ${result}`, {
          to: formattedTo,
          textLength: text.length
        });
        
        return { success: result, connected: true, method: 'global_socket' };
      } catch (error) {
        whatsappServiceLog('WARNING', 'Global socket failed, falling back to API', { error: error.message });
      }
    }
    
    // Fallback ke API bot
    const { data } = await axios.post(`${getBotUrl()}/send`, {
      to: formattedTo,
      message: text,
      mentions,
      adminKey: getAdminKey()
    }, { timeout: 10000 });
    
    whatsappServiceLog('SUCCESS', `Message sent via API: ${to}`, data);
    return { success: data.success, connected: true, method: 'api', ...data };
    
  } catch (error) {
    whatsappServiceLog('ERROR', `Send message failed to: ${to}`, { error: error.message });
    return {
      success: false,
      connected: false,
      message: error.message,
      error: 'Gagal mengirim pesan WhatsApp'
    };
  }
}

// Kirim notifikasi untuk JSON request
async function sendJsonRequestNotification(requestData) {
  whatsappServiceLog('INFO', 'Sending JSON request notification', { requestId: requestData.id });
  
  try {
    const config = getConfig();
    const groupId = formatGroupId(config.whatsapp?.group_id);
    
    if (!groupId) {
      whatsappServiceLog('ERROR', 'WhatsApp Group ID tidak dikonfigurasi');
      return {
        success: false,
        connected: false,
        message: 'WhatsApp Group ID tidak dikonfigurasi'
      };
    }
    
    const message = `🆕 *Request Server Baru*

📋 *Detail Request:*
ID: ${requestData.id}
👤 Nama: ${requestData.name}
📧 Email: ${requestData.email}
📱 WhatsApp: ${requestData.whatsapp}
🖥️ Tipe Server: ${requestData.serverType}
📅 Tanggal: ${new Date(requestData.createdAt).toLocaleString('id-ID')}

Status: ${requestData.processed ? '✅ Diproses' : '⏳ Menunggu'}`;

    const result = await sendMessage(groupId, message);
    
    // DM ke admin
    await sendToAdmins(message);
    
    whatsappServiceLog(result.success ? 'SUCCESS' : 'ERROR', 'JSON request notification result', result);
    return result;
    
  } catch (error) {
    whatsappServiceLog('ERROR', 'Send JSON notification failed', { error: error.message });
    return {
      success: false,
      connected: false,
      message: error.message
    };
  }
}

// Kirim notifikasi untuk new request
async function sendNewRequestNotification(requestData) {
  whatsappServiceLog('INFO', 'Sending new request notification', { requestId: requestData.id });
  
  try {
    const config = getConfig();
    const groupId = formatGroupId(config.whatsapp?.group_id);
    
    if (!groupId) {
      whatsappServiceLog('ERROR', 'WhatsApp Group ID tidak dikonfigurasi');
      return {
        success: false,
        connected: false,
        message: 'WhatsApp Group ID tidak dikonfigurasi'
      };
    }
    
    const message = `📝 *Permintaan Baru*

👤 Nama: ${requestData.name}
📧 Email: ${requestData.email}
📱 WhatsApp: ${requestData.whatsapp}
🖥️ Tipe: ${requestData.serverType}
📅 Waktu: ${new Date().toLocaleString('id-ID')}

Silakan proses melalui admin panel.`;

    const result = await sendMessage(groupId, message);
    
    // DM ke admin
    await sendToAdmins(message);
    
    whatsappServiceLog(result.success ? 'SUCCESS' : 'ERROR', 'New request notification result', result);
    return result;
    
  } catch (error) {
    whatsappServiceLog('ERROR', 'Send new request notification failed', { error: error.message });
    return {
      success: false,
      connected: false,
      message: error.message
    };
  }
}

// Kirim broadcast message
async function sendBroadcast(message) {
  whatsappServiceLog('INFO', 'Sending broadcast message');
  
  try {
    const config = getConfig();
    const groupId = formatGroupId(config.whatsapp?.group_id);
    
    if (!groupId) {
      whatsappServiceLog('ERROR', 'WhatsApp Group ID tidak dikonfigurasi');
      return {
        success: false,
        connected: false,
        message: 'WhatsApp Group ID tidak dikonfigurasi'
      };
    }

    const result = await sendMessage(groupId, message);
    
    whatsappServiceLog(result.success ? 'SUCCESS' : 'ERROR', 'Broadcast result', result);
    return result;
    
  } catch (error) {
    whatsappServiceLog('ERROR', 'Send broadcast failed', { error: error.message });
    return {
      success: false,
      connected: false,
      message: error.message
    };
  }
}

// Execute admin command via bot API
async function executeAdminCommand(command, params = {}) {
  whatsappServiceLog('INFO', `Executing admin command: ${command}`, params);
  
  try {
    const { data } = await axios.post(`${getBotUrl()}/command`, {
      command,
      params,
      adminKey: getAdminKey()
    }, { timeout: 10000 });
    
    whatsappServiceLog('SUCCESS', `Admin command executed: ${command}`, data);
    return data;
  } catch (error) {
    whatsappServiceLog('ERROR', `Admin command failed: ${command}`, { error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  checkBotStatus,
  sendMessage,
  sendJsonRequestNotification,
  sendNewRequestNotification,
  sendBroadcast,
  sendToAdmins,
  executeAdminCommand,
  formatWhatsAppNumber,
  formatGroupId,
  getAdminNumbers,
  sendToAdmins
};
