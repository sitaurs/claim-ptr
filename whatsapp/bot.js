const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const { executeAdminCommand } = require('../services/whatsapp-admin');
const { getGroupConfig } = require('../services/welcome-config');

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

// Helper format JID user & group
function formatUserJid(number) {
  if (!number) return null;
  if (number.endsWith('@s.whatsapp.net')) return number;
  let n = String(number).replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (!n.startsWith('62')) n = '62' + n;
  return n + '@s.whatsapp.net';
}

function formatGroupId(groupId) {
  if (!groupId) return null;
  return groupId.endsWith('@g.us') ? groupId : groupId + '@g.us';
}

// Fungsi untuk mengirim pesan
async function sendMessage(to, message, mentions = null) {
  botLog('INFO', `Attempting to send message to: ${to}`);
  
  // Get socket from global variable if local sock is null
  const activeSocket = sock || global.whatsappSocket;
  
  if (!activeSocket) {
    botLog('ERROR', 'WhatsApp bot not connected');
    return false;
  }

  try {
    botLog('DEBUG', `Original recipient: ${to}`);
    // Format hanya jika bukan JID lengkap (user) dan bukan group
    if (!to.endsWith('@s.whatsapp.net') && !to.endsWith('@g.us')) {
      to = to.replace(/^\+/, '');
      to = to.replace(/^0/, '62');
      to = to.replace(/[- ]/g, '');
      to = `${to}@s.whatsapp.net`;
    }
    botLog('DEBUG', `Formatted recipient: ${to}`);

    const payload = mentions && Array.isArray(mentions) && mentions.length > 0 ? { text: message, mentions } : { text: message };
    await activeSocket.sendMessage(to, payload);
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
async function sendWelcomeMessage(newUserJid, groupId) {
  try {
    const { getConfig } = require('../services/config');
    const cfg = await getConfig();
    const baseUrl = (cfg.server && cfg.server.base_url) ? cfg.server.base_url.replace(/\/+$/, '') : 'http://localhost:3000';
    const claimUrl = `${baseUrl}/claim`;

    // Pastikan groupId & userJid terformat benar
    const formattedGroupId = formatGroupId(groupId);
    const formattedUserJid = formatUserJid(newUserJid);

    // Pesan ke grup (mention)
    const mentionText = `👋 Selamat datang @${formattedUserJid.split('@')[0]} di MOOTERACT HUB!\n\nSilakan klaim server gratis Anda di ${claimUrl}`;
    if (sock) {
      await sock.sendMessage(formattedGroupId, { text: mentionText, mentions: [formattedUserJid] });
    } else {
      await sendMessage(formattedGroupId, mentionText);
    }

    // Pesan pribadi
    const privateMessage = `*Selamat Datang di MOOTERACT HUB!*\n\nAnda telah bergabung dengan grup kami. Klaim server Node.js, Python, atau N8n gratis di ${claimUrl}`;
    await sendMessage(formattedUserJid, privateMessage);
    botLog('SUCCESS', 'Welcome messages sent');
    return true;
  } catch (err) {
    botLog('ERROR', 'Failed to send welcome messages', { error: err.message });
    return false;
  }
}

// Fungsi untuk mengirim promosi
async function sendPromotion(groupId, promotionMessage) {
  botLog('INFO', `Sending promotion to group: ${groupId}`, { 
    messageLength: promotionMessage?.length || 0 
  });
  try {
    // Jika groupId tidak @g.us, coba ambil dari config
    let target = groupId;
    if (!String(target).endsWith('@g.us')) {
      try {
        const { getConfig } = require('../services/config');
        const cfg = await getConfig();
        const cfgGroup = cfg?.whatsapp?.group_id || target;
        target = formatGroupId(cfgGroup);
      } catch {}
    }
    const ok = await sendMessage(target, promotionMessage);
    if (!ok) {
      botLog('ERROR', 'Promotion failed to send (sendMessage returned false)', { target });
    }
    botLog(ok ? 'SUCCESS' : 'ERROR', `Promotion send result: ${ok}`);
    return ok;
  } catch (e) {
    botLog('ERROR', 'Promotion send exception', { error: e.message });
    return false;
  }
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

  // Handle group participant updates (join events)
  sock.ev.on('group-participants.update', async (upd) => {
    try {
      const { id: groupId, participants, action } = upd;
      const { getConfig } = require('../services/config');
      const cfg = await getConfig();
      const targetGroup = (cfg.whatsapp && cfg.whatsapp.group_id) ? cfg.whatsapp.group_id : null;
      if (!targetGroup) return; // group not configured

      // Normalise to @g.us
      const formattedTarget = targetGroup.includes('@g.us') ? targetGroup : targetGroup + '@g.us';
      if (groupId !== formattedTarget) return; // not our group

      const groupCfg = getGroupConfig(groupId);

      if (!groupCfg.on) return; // fitur welcome dimatikan

      const meta = await sock.groupMetadata(groupId).catch(() => null);
      const groupName = meta?.subject || 'Group';

      if (action === 'add' && participants && participants.length) {
        // Jika tagAllOnJoin aktif, mention semua member; else hanya yang baru join
        const mentionTargets = groupCfg.tagAllOnJoin && meta ? meta.participants.map(x=>x.id) : participants;

        // Render template
        const text = (groupCfg.welcome || 'Selamat datang, @user di *{group}*!')
          .replace('{group}', groupName)
          .replace('@user', participants.map(j=> '@'+j.split('@')[0]).join(', '));

        await sendMessage(groupId, text, mentionTargets);

        // DM masing-masing
        for (const p of participants) {
          await sendWelcomeMessage(p, groupId); // reuse existing private message
        }
      } else if (action === 'remove' && participants && participants.length) {
        const text = (groupCfg.bye || 'Sampai jumpa, @user dari *{group}*.')
          .replace('{group}', groupName)
          .replace('@user', participants.map(j=> '@'+j.split('@')[0]).join(', '));
        await sendMessage(groupId, text, participants);
      }
    } catch (err) {
      botLog('ERROR', 'Failed handling group participant update', { error: err.message });
    }
  });

  // Menangani pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    botLog('DEBUG', `Received ${messages.length} messages`);
    
    for (const message of messages) {
      try {
        // (Moved join handling to dedicated listener)
        
        // Handle text messages for admin commands
        if (message.message?.conversation || message.message?.extendedTextMessage?.text) {
          const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text;
          const from = message.key.remoteJid;
          const senderJid = message.key.participant || message.key.remoteJid;
          
          botLog('MESSAGE', `Received message from ${from}`, {
            messageText: messageText?.substring(0, 100) + (messageText?.length > 100 ? '...' : ''),
            isCommand: messageText?.startsWith('!')
          });
          
          // Check if message starts with admin command
          if (messageText && messageText.startsWith('!')) {
            const command = messageText.split(' ')[0];
            try {
              const { getConfig } = require('../services/config');
              const cfg = await getConfig();
              const adminNums = Array.isArray(cfg?.whatsapp?.admin_numbers) ? cfg.whatsapp.admin_numbers : (cfg?.whatsapp?.admin_number ? [cfg.whatsapp.admin_number] : []);
              const adminJids = adminNums.filter(Boolean).map(n => formatUserJid(n));
              if (!adminJids.includes(senderJid)) {
                botLog('WARNING', `Ignoring admin command from non-admin: ${senderJid}`);
              } else {
                botLog('INFO', `Processing admin command: ${command} from ${from}`);
                await executeAdminCommand(command, from, messageText, sendMessage);
              }
            } catch (e) {
              botLog('ERROR', 'Admin command processing error', { error: e.message });
            }
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
  getQRCode,
  loadAndSchedulePromotions
};