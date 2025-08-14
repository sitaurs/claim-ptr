const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { executeAdminCommand } = require('../services/whatsapp-admin');

console.log('🤖 WhatsApp Bot Module Loading...');

// Function untuk logging dengan timestamp  
function botLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅', 
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛',
    'MESSAGE': '💬'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [BOT][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

botLog('INFO', 'Checking auth directory...');
// Memastikan folder auth ada
if (!fs.existsSync('./whatsapp/auth')) {
  botLog('WARNING', 'Auth directory not found, creating...');
  fs.mkdirSync('./whatsapp/auth', { recursive: true });
  botLog('SUCCESS', 'Auth directory created');
} else {
  botLog('SUCCESS', 'Auth directory exists');
}

// Menyimpan instance bot dan state
let sock = null;
let currentConnectionState = 'closed';
let currentQRCode = null;

// Fungsi untuk mengirim pesan
async function sendMessage(to, message) {
  botLog('INFO', `Attempting to send message to: ${to}`);
  
  // Get socket from global variable if local sock is null
  const activeSocket = sock || global.whatsappSocket;
  
  if (!activeSocket) {
    botLog('ERROR', 'WhatsApp bot not connected');
    return false;
  }

  try {
    botLog('DEBUG', `Original recipient: ${to}`);
    // Format nomor telepon
    if (!to.endsWith('@s.whatsapp.net')) {
      to = to.replace(/^\+/, '');
      to = to.replace(/^0/, '62');
      to = to.replace(/[- ]/g, '');
      to = `${to}@s.whatsapp.net`;
    }
    botLog('DEBUG', `Formatted recipient: ${to}`);

    await activeSocket.sendMessage(to, { text: message });
    botLog('SUCCESS', `Message sent successfully to: ${to}`);
    return true;
  } catch (error) {
    botLog('ERROR', 'Failed to send WhatsApp message', {
      error: error.message,
      recipient: to,
      messageLength: message?.length || 0
    });
    return false;
  }
}

// Fungsi untuk mengirim OTP
async function sendOTP(to, otp) {
  botLog('INFO', `Sending OTP to: ${to}`, { otp });
  const message = `*MOOTERACT HUB - Kode OTP*\n\nKode OTP Anda adalah: *${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.`;
  const result = await sendMessage(to, message);
  botLog(result ? 'SUCCESS' : 'ERROR', `OTP send result: ${result}`);
  return result;
}

// Fungsi untuk mengirim detail akun
async function sendAccountDetails(to, email, password, serverName, serverType, panelUrl) {
  botLog('INFO', `Sending account details to: ${to}`, {
    email,
    serverName,
    serverType,
    panelUrl
  });
  const message = `*MOOTERACT HUB - Detail Akun Server*\n\nSelamat! Server Anda telah berhasil dibuat.\n\nDetail Akun:\nEmail: ${email}\nPassword: ${password}\nNama Server: ${serverName}\nTipe Server: ${serverType}\n\nSilahkan akses server Anda di: ${panelUrl}\n\nTerima kasih telah menggunakan layanan kami!`;
  const result = await sendMessage(to, message);
  botLog(result ? 'SUCCESS' : 'ERROR', `Account details send result: ${result}`);
  return result;
}

// Fungsi untuk mengirim pesan selamat datang
async function sendWelcomeMessage(to) {
  botLog('INFO', `Sending welcome message to: ${to}`);
  const message = `*Selamat Datang di MOOTERACT HUB!*\n\nTerima kasih telah bergabung dengan grup kami. Anda dapat melakukan klaim server Node.js, Python, atau N8n secara gratis di link berikut:\n\nhttp://localhost:3000/claim\n\nSilahkan kunjungi link tersebut untuk melakukan klaim server Anda.`;
  const result = await sendMessage(to, message);
  botLog(result ? 'SUCCESS' : 'ERROR', `Welcome message send result: ${result}`);
  return result;
}

// Fungsi untuk mengirim promosi
async function sendPromotion(groupId, promotionMessage) {
  botLog('INFO', `Sending promotion to group: ${groupId}`, { 
    messageLength: promotionMessage?.length || 0 
  });
  const result = await sendMessage(groupId, promotionMessage);
  botLog(result ? 'SUCCESS' : 'ERROR', `Promotion send result: ${result}`);
  return result;
}

// Inisialisasi WhatsApp bot
async function initWhatsApp() {
  botLog('INFO', 'Initializing WhatsApp bot...');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./whatsapp/auth');
    botLog('SUCCESS', 'Auth state loaded successfully');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true
    });
    botLog('SUCCESS', 'WhatsApp socket created');

    // Menangani koneksi
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Update global state
      if (connection) currentConnectionState = connection;
      if (qr) currentQRCode = qr;
      
      botLog('INFO', 'Connection update received', { 
        connection, 
        hasQR: !!qr,
        hasLastDisconnect: !!lastDisconnect 
      });

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      botLog('WARNING', 'WhatsApp connection closed', {
        error: lastDisconnect?.error?.message || 'Unknown error',
        shouldReconnect,
        statusCode: lastDisconnect?.error?.output?.statusCode
      });
      
      if (shouldReconnect) {
        botLog('INFO', 'Attempting to reconnect...');
        initWhatsApp();
      } else {
        botLog('ERROR', 'Bot logged out, manual reconnection required');
      }
    } else if (connection === 'open') {
      botLog('SUCCESS', '🎉 WhatsApp bot connected successfully!');
      
      // Memuat dan menjalankan jadwal promosi
      loadAndSchedulePromotions();
    }

    if (qr) {
      currentQRCode = qr;
      qrcode.generate(qr, { small: true });
      botLog('INFO', '📱 Scan QR code above to login WhatsApp');
    }
  });

  // Menyimpan credentials saat update
  sock.ev.on('creds.update', saveCreds);
  botLog('SUCCESS', 'Credentials update handler registered');

  // Menangani pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    botLog('DEBUG', `Received ${messages.length} messages`);
    
    for (const message of messages) {
      try {
        // Handle new members in group
        if (message.key.remoteJid.endsWith('@g.us') && message.messageStubType === 27) {
          const newMember = message.messageStubParameters[0];
          botLog('INFO', `New member joined group: ${newMember}`);
          await sendWelcomeMessage(newMember);
        }
        
        // Handle text messages for admin commands
        if (message.message?.conversation || message.message?.extendedTextMessage?.text) {
          const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text;
          const from = message.key.remoteJid;
          const isFromAdmin = message.key.participant || message.key.remoteJid;
          
          botLog('MESSAGE', `Received message from ${from}`, {
            messageText: messageText?.substring(0, 100) + (messageText?.length > 100 ? '...' : ''),
            isCommand: messageText?.startsWith('!')
          });
          
          // Check if message starts with admin command
          if (messageText && messageText.startsWith('!')) {
            const command = messageText.split(' ')[0];
            botLog('INFO', `Processing admin command: ${command} from ${from}`);
            
            // Execute admin command
            await executeAdminCommand(command, from, messageText, sendMessage);
          }
        }
      } catch (error) {
        botLog('ERROR', 'Error processing message', {
          error: error.message,
          messageId: message.key.id,
          from: message.key.remoteJid
        });
      }
    }
  });

  // Store the socket in global variable for other functions to use
  global.whatsappSocket = sock;
  botLog('SUCCESS', 'WhatsApp socket stored in global variable');

  return sock;
  } catch (error) {
    botLog('ERROR', 'Failed to initialize WhatsApp bot', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Memuat dan menjadwalkan promosi
function loadAndSchedulePromotions() {
  botLog('INFO', 'Loading and scheduling promotions...');
  try {
    const promotions = fs.readJsonSync('./data/promotions.json');
    botLog('SUCCESS', `Loaded ${promotions.length} promotions`);
    
    // Membersihkan interval yang mungkin sudah ada
    global.promotionIntervals = global.promotionIntervals || [];
    global.promotionIntervals.forEach(interval => clearInterval(interval));
    global.promotionIntervals = [];
    
    // Menjadwalkan promosi baru
    promotions.forEach(promo => {
      if (promo.active && promo.groupId && promo.message && promo.intervalMinutes > 0) {
        const interval = setInterval(() => {
          botLog('INFO', `Sending scheduled promotion to: ${promo.groupId}`);
          sendPromotion(promo.groupId, promo.message);
        }, promo.intervalMinutes * 60 * 1000);
        
        global.promotionIntervals.push(interval);
        botLog('SUCCESS', `Scheduled promotion for group: ${promo.groupId}, interval: ${promo.intervalMinutes} minutes`);
      }
    });
    
    botLog('SUCCESS', `${global.promotionIntervals.length} promotions scheduled successfully`);
  } catch (error) {
    botLog('ERROR', 'Failed to schedule promotions', {
      error: error.message,
      stack: error.stack
    });
  }
}

// Fungsi untuk mendapatkan status koneksi
function getConnectionState() {
  return currentConnectionState;
}

// Fungsi untuk mendapatkan QR code
function getQRCode() {
  return currentQRCode;
}

module.exports = {
  initWhatsApp,
  sendMessage,
  sendOTP,
  sendAccountDetails,
  sendWelcomeMessage,
  sendPromotion,
  getConnectionState,
  getQRCode
};