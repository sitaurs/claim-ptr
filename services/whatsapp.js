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
  
  const logMessage = `${prefix[level] || 'ℹ️'} [WA-SERVICE][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

// Mendapatkan konfigurasi
const CONFIG_FILE_PATH = path.join(__dirname, '../data/config.json');
let config;

try {
  config = fs.readJsonSync(CONFIG_FILE_PATH);
  whatsappServiceLog('SUCCESS', 'Config loaded for WhatsApp service');
} catch (error) {
  whatsappServiceLog('ERROR', 'Error membaca file konfigurasi', { error: error.message });
  config = {
    server: { admin_session_secret: process.env.ADMIN_SESSION_SECRET || 'default-secret' },
    whatsapp: { group_id: '' }
  };
}

// URL API Bot WhatsApp
const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001/api/bot';

/**
 * Mengirim pesan ke nomor WhatsApp
 * @param {string} to - Nomor tujuan
 * @param {string} message - Pesan yang akan dikirim
 */
async function sendMessage(to, message) {
  whatsappServiceLog('INFO', `Attempting to send message via API to: ${to}`);
  
  try {
    const response = await axios.post(`${BOT_API_URL}/send-message`, {
      to,
      message,
      adminKey: process.env.ADMIN_SESSION_SECRET || 'default-secret'
    }, {
      timeout: 10000 // 10 second timeout
    });
    
    whatsappServiceLog('SUCCESS', `Message sent successfully to: ${to}`, { 
      response: response.data 
    });
    return response.data.success;
  } catch (error) {
    whatsappServiceLog('ERROR', 'Error mengirim pesan WhatsApp', {
      error: error.message,
      recipient: to,
      botApiUrl: BOT_API_URL,
      isConnectionError: error.code === 'ECONNREFUSED'
    });
    return false;
  }
}

/**
 * Mengirim OTP ke nomor WhatsApp
 * @param {string} to - Nomor tujuan
 * @param {string} otp - Kode OTP
 */
async function sendOTP(to, otp) {
  whatsappServiceLog('INFO', `Sending OTP via API to: ${to}`, { otp });
  
  try {
    const response = await axios.post(`${BOT_API_URL}/send-otp`, {
      to,
      otp,
      adminKey: process.env.ADMIN_SESSION_SECRET || 'default-secret'
    }, {
      timeout: 10000 // 10 second timeout
    });
    
    whatsappServiceLog('SUCCESS', `OTP sent successfully to: ${to}`, {
      response: response.data
    });
    return response.data.success;
  } catch (error) {
    whatsappServiceLog('ERROR', 'Error mengirim OTP WhatsApp', {
      error: error.message,
      recipient: to,
      otp,
      botApiUrl: BOT_API_URL,
      isConnectionError: error.code === 'ECONNREFUSED'
    });
    return false;
  }
}

/**
 * Mengirim detail akun ke nomor WhatsApp
 * @param {string} to - Nomor tujuan
 * @param {string} email - Email akun
 * @param {string} password - Password akun
 * @param {string} serverName - Nama server
 * @param {string} serverType - Tipe server
 * @param {string} panelUrl - URL panel
 */
async function sendAccountDetails(to, email, password, serverName, serverType, panelUrl) {
  try {
    const response = await axios.post(`${BOT_API_URL}/send-account-details`, {
      to,
      email,
      password,
      serverName,
      serverType,
      panelUrl: panelUrl || process.env.PANEL_URL,
      adminKey: process.env.ADMIN_SESSION_SECRET || 'default-secret'
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error mengirim detail akun WhatsApp:', error.message);
    return false;
  }
}

/**
 * Mengirim promosi ke grup WhatsApp
 * @param {string} message - Pesan promosi
 */
async function sendPromotion(message) {
  try {
    const response = await axios.post(`${BOT_API_URL}/send-promotion`, {
      message,
      adminKey: process.env.ADMIN_SESSION_SECRET || 'default-secret'
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error mengirim promosi WhatsApp:', error.message);
    return false;
  }
}

/**
 * Menjalankan perintah admin
 * @param {string} command - Perintah admin
 * @param {object} params - Parameter perintah
 */
async function executeAdminCommand(command, params = {}) {
  try {
    const response = await axios.post(`${BOT_API_URL}/admin-command`, {
      command,
      params,
      adminKey: process.env.ADMIN_SESSION_SECRET || 'default-secret'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error menjalankan perintah admin WhatsApp:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  sendMessage,
  sendOTP,
  sendAccountDetails,
  sendPromotion,
  executeAdminCommand
};
