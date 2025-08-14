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
  const config = getConfig();
  const key = config.server?.admin_session_secret || 'default-secret';
  whatsappServiceLog('DEBUG', 'Admin key retrieved');
  return key;
}

async function checkBotStatus() {
  whatsappServiceLog('INFO', 'Checking bot status...');
  try {
    const { data } = await axios.get(`${getBotUrl()}/status`, { timeout: 5000 });
    whatsappServiceLog('SUCCESS', 'Bot status retrieved', data);
    return { success: true, ...data };
  } catch (error) {
    whatsappServiceLog('ERROR', 'Bot status check failed', { error: error.message });
    return { 
      success: false, 
      ready: false,
      online: false,
      message: error.message,
      error: 'Bot tidak dapat dijangkau'
    };
  }
}

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

async function sendJsonRequestNotification(requestData) {
  whatsappServiceLog('INFO', 'Sending JSON request notification', { requestId: requestData.id });
  try {
    const config = getConfig();
    const groupId = config.whatsapp?.group_id;
    
    if (!groupId) {
      throw new Error('WhatsApp Group ID tidak dikonfigurasi');
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

    const { data } = await axios.post(`${getBotUrl()}/send`, {
      to: groupId,
      message: message,
      adminKey: getAdminKey()
    }, { timeout: 10000 });

    whatsappServiceLog('SUCCESS', 'JSON request notification sent', data);
    return data;
  } catch (error) {
    whatsappServiceLog('ERROR', 'Send notification failed', { error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
}

async function sendMessage(to, message) {
  whatsappServiceLog('INFO', `Sending message to: ${to}`);
  try {
    const { data } = await axios.post(`${getBotUrl()}/send`, {
      to,
      message,
      adminKey: getAdminKey()
    }, { timeout: 10000 });
    whatsappServiceLog('SUCCESS', `Message sent to: ${to}`, data);
    return data;
  } catch (error) {
    whatsappServiceLog('ERROR', `Send message failed to: ${to}`, { error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
}

async function sendBroadcast(message) {
  whatsappServiceLog('INFO', 'Sending broadcast message');
  try {
    const config = getConfig();
    const groupId = config.whatsapp?.group_id;
    
    if (!groupId) {
      throw new Error('WhatsApp Group ID tidak dikonfigurasi');
    }

    const result = await sendMessage(groupId, message);
    whatsappServiceLog('SUCCESS', 'Broadcast message sent', result);
    return result;
  } catch (error) {
    whatsappServiceLog('ERROR', 'Send broadcast failed', { error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  checkBotStatus,
  executeAdminCommand,
  sendJsonRequestNotification,
  sendMessage,
  sendBroadcast
};
