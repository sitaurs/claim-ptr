const fs = require('fs-extra');
const { getConfig } = require('./config');
const { getGroupConfig, setGroupConfig } = require('./welcome-config'); // ADD after other requires

// Function untuk logging dengan timestamp
function adminLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛',
    'COMMAND': '⚡'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [ADMIN][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

function ensureGroupCfg(jid) {
  const cfg = getGroupConfig(jid);
  return cfg;
}

/**
 * Menjalankan perintah admin WhatsApp
 * @param {string} command - Perintah yang dijalankan
 * @param {string} from - Nomor pengirim
 * @param {string} message - Pesan lengkap
 * @param {Function} sendMessage - Fungsi untuk mengirim pesan
 */
async function executeAdminCommand(command, from, message, sendMessage) {
  adminLog('COMMAND', `Received admin command: ${command}`, {
    from,
    fullMessage: message
  });
  
  try {
    const config = await getConfig();
    adminLog('SUCCESS', 'Config loaded for admin command processing');
    
    // Verifikasi apakah pengirim adalah admin (bisa ditambahkan validasi nomor admin)
    const validCommands = config.whatsapp.admin_commands.map(cmd => cmd.command);
    
    if (!validCommands.includes(command)) {
      adminLog('WARNING', `Invalid command received: ${command}`, { from });
      return false;
    }

    adminLog('INFO', `Processing valid command: ${command}`);
    let response = '';

    switch (command) {
      case '!help':
        adminLog('INFO', 'Processing help command');
        response = '*🤖 ADMIN COMMANDS*\n\n';
        config.whatsapp.admin_commands.forEach(cmd => {
          response += `${cmd.command} - ${cmd.description}\n`;
        });
        adminLog('SUCCESS', 'Help command response generated');
        break;

      case '!status':
        adminLog('INFO', 'Processing status command');
        const users = await fs.readJson('./data/users.json').catch(() => []);
        const servers = await fs.readJson('./data/servers.json').catch(() => []);
        const requests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
        
        const statusData = {
          totalUsers: users.length,
          totalServers: servers.length,
          pendingRequests: requests.filter(r => r.status === 'pending').length,
          uptime: process.uptime().toFixed(0)
        };
        
        adminLog('SUCCESS', 'Status data collected', statusData);
        
        response = `*📊 STATUS SISTEM*\n\n`;
        response += `👥 Total Users: ${statusData.totalUsers}\n`;
        response += `🖥️ Total Servers: ${statusData.totalServers}\n`;
        response += `📋 Pending Requests: ${statusData.pendingRequests}\n`;
        response += `⏰ Uptime: ${statusData.uptime} detik`;
        break;

      case '!stats':
        adminLog('INFO', 'Processing stats command');
        const allUsers = await fs.readJson('./data/users.json').catch(() => []);
        const allServers = await fs.readJson('./data/servers.json').catch(() => []);
        
        const nodejsServers = allServers.filter(s => s.type === 'nodejs').length;
        const pythonServers = allServers.filter(s => s.type === 'python').length;
        const n8nServers = allServers.filter(s => s.type === 'n8n').length;
        
        const statsData = {
          nodejsServers,
          pythonServers,
          n8nServers,
          totalUsers: allUsers.length,
          latestUser: allUsers.length > 0 ? allUsers[allUsers.length - 1].createdAt : null
        };
        
        adminLog('SUCCESS', 'Stats data collected', statsData);
        
        response = `*📈 STATISTIK DETAIL*\n\n`;
        response += `📊 Server berdasarkan tipe:\n`;
        response += `• Node.js: ${nodejsServers}\n`;
        response += `• Python: ${pythonServers}\n`;
        response += `• N8N: ${n8nServers}\n\n`;
        response += `📅 User terbaru: ${allUsers.length > 0 ? new Date(allUsers[allUsers.length - 1].createdAt).toLocaleDateString('id-ID') : 'Belum ada'}`;
        break;

      case '!requests':
        adminLog('INFO', 'Processing requests command');
        const pendingRequests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
        const pending = pendingRequests.filter(r => r.status === 'pending');
        
        adminLog('SUCCESS', `Found ${pending.length} pending requests`);
        
        if (pending.length === 0) {
          response = `*📋 PENDING REQUESTS*\n\nTidak ada request yang pending.`;
        } else {
          response = `*📋 PENDING REQUESTS (${pending.length})*\n\n`;
          pending.slice(0, 5).forEach((req, index) => {
            response += `${index + 1}. ID: ${req.id}\n`;
            response += `   Name: ${req.name}\n`;
            response += `   Email: ${req.email}\n`;
            response += `   Phone: ${req.phoneNumber}\n`;
            response += `   Date: ${new Date(req.createdAt).toLocaleDateString('id-ID')}\n\n`;
          });
          
          if (pending.length > 5) {
            response += `... dan ${pending.length - 5} lainnya`;
          }
        }
        break;

      case '!broadcast':
        adminLog('INFO', 'Processing broadcast command');
        const broadcastMessage = message.replace('!broadcast ', '');
        if (broadcastMessage === message) {
          adminLog('WARNING', 'Broadcast command missing message');
          response = `*❌ ERROR*\n\nFormat: !broadcast <pesan>`;
        } else {
          const targetGroup = (config.whatsapp && config.whatsapp.group_id) ? (config.whatsapp.group_id.includes('@g.us') ? config.whatsapp.group_id : config.whatsapp.group_id + '@g.us') : '';
          adminLog('INFO', `Broadcasting message to group: ${targetGroup}`, {
            messageLength: broadcastMessage.length
          });
          // Kirim broadcast ke grup
          await sendMessage(targetGroup, `*📢 BROADCAST ADMIN*\n\n${broadcastMessage}`);
          response = `*✅ SUCCESS*\n\nBroadcast berhasil dikirim ke grup.`;
          adminLog('SUCCESS', 'Broadcast sent successfully');
        }
        break;

      case '!approve':
        adminLog('INFO', 'Processing approve command');
        const approveId = message.replace('!approve ', '').trim();
        if (approveId === message || !approveId) {
          adminLog('WARNING', 'Approve command missing request ID');
          response = `*❌ ERROR*\n\nFormat: !approve <request_id>`;
        } else {
          adminLog('INFO', `Approving N8N request: ${approveId}`);
          const result = await approveN8NRequest(approveId);
          response = result.success ? 
            `*✅ SUCCESS*\n\nRequest ${approveId} berhasil diapprove.` :
            `*❌ ERROR*\n\n${result.message}`;
          adminLog(result.success ? 'SUCCESS' : 'ERROR', `Approve result for ${approveId}`, result);
        }
        break;

      case '!reject':
        adminLog('INFO', 'Processing reject command');
        const rejectId = message.replace('!reject ', '').trim();
        if (rejectId === message || !rejectId) {
          adminLog('WARNING', 'Reject command missing request ID');
          response = `*❌ ERROR*\n\nFormat: !reject <request_id>`;
        } else {
          adminLog('INFO', `Rejecting N8N request: ${rejectId}`);
          const result = await rejectN8NRequest(rejectId);
          response = result.success ? 
            `*✅ SUCCESS*\n\nRequest ${rejectId} berhasil direject.` :
            `*❌ ERROR*\n\n${result.message}`;
          adminLog(result.success ? 'SUCCESS' : 'ERROR', `Reject result for ${rejectId}`, result);
        }
        break;

      case '!restart':
        adminLog('WARNING', 'Bot restart command received');
        response = `*🔄 RESTARTING*\n\nBot WhatsApp akan restart dalam 3 detik...`;
        await sendMessage(from, response);
        
        setTimeout(() => {
          adminLog('INFO', 'Restarting bot process...');
          process.exit(0); // Bot akan restart jika menggunakan process manager
        }, 3000);
        return true;

      case '!welcome': {
        if (!from.endsWith('@g.us')) {
          response = 'Perintah ini hanya bisa di grup.'; break; }
        const mode = (message.split(' ')[1] || '').toLowerCase();
        if (!['on','off'].includes(mode)) { response = 'Format: !welcome on|off'; break; }
        setGroupConfig(from, { on: mode==='on' });
        response = `Welcome/Bye di grup ini: ${mode.toUpperCase()}`;
        break;
      }
      case '!welcomemsg': {
        if (!from.endsWith('@g.us')) { response='Perintah ini hanya di grup'; break; }
        const teks = message.replace('!welcomemsg','').trim();
        if (!teks) { response='Format: !welcomemsg <teks>'; break; }
        setGroupConfig(from, { welcome: teks });
        response='Template welcome diperbarui.'; break;
      }
      case '!byemsg': {
        if (!from.endsWith('@g.us')) { response='Perintah ini hanya di grup'; break; }
        const teks = message.replace('!byemsg','').trim();
        if (!teks) { response='Format: !byemsg <teks>'; break; }
        setGroupConfig(from, { bye: teks });
        response='Template bye diperbarui.'; break;
      }
      case '!tagalljoin': {
        if (!from.endsWith('@g.us')) { response='Perintah ini hanya di grup'; break; }
        const mode = (message.split(' ')[1] || '').toLowerCase();
        if (!['on','off'].includes(mode)) { response='Format: !tagalljoin on|off'; break; }
        setGroupConfig(from, { tagAllOnJoin: mode==='on' });
        response=`Tag @all saat join: ${mode.toUpperCase()}`; break;
      }

      default:
        adminLog('WARNING', `Unknown command received: ${command}`);
        return false;
    }

    if (response) {
      adminLog('SUCCESS', `Sending response for command: ${command}`, {
        responseLength: response.length
      });
      await sendMessage(from, response);
      return true;
    }

    return false;
  } catch (error) {
    adminLog('ERROR', 'Error executing admin command', {
      error: error.message,
      stack: error.stack,
      command,
      from
    });
    await sendMessage(from, `*❌ ERROR*\n\nTerjadi kesalahan: ${error.message}`);
    return false;
  }
}

/**
 * Approve N8N request
 */
async function approveN8NRequest(requestId) {
  adminLog('INFO', `Starting approve process for request: ${requestId}`);
  try {
    const requests = await fs.readJson('./data/n8n_requests.json');
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      adminLog('WARNING', `Request not found: ${requestId}`);
      return { success: false, message: 'Request tidak ditemukan' };
    }

    adminLog('SUCCESS', `Request found, updating status`, {
      requestId,
      currentStatus: requests[requestIndex].status
    });

    requests[requestIndex].status = 'approved';
    requests[requestIndex].updatedAt = new Date().toISOString();
    
    await fs.writeJson('./data/n8n_requests.json', requests, { spaces: 2 });
    adminLog('SUCCESS', `Request ${requestId} successfully approved`);
    
    return { success: true };
  } catch (error) {
    adminLog('ERROR', `Failed to approve request ${requestId}`, {
      error: error.message,
      stack: error.stack
    });
    return { success: false, message: error.message };
  }
}

/**
 * Reject N8N request
 */
async function rejectN8NRequest(requestId) {
  adminLog('INFO', `Starting reject process for request: ${requestId}`);
  try {
    const requests = await fs.readJson('./data/n8n_requests.json');
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      adminLog('WARNING', `Request not found: ${requestId}`);
      return { success: false, message: 'Request tidak ditemukan' };
    }

    adminLog('SUCCESS', `Request found, updating status`, {
      requestId,
      currentStatus: requests[requestIndex].status
    });

    requests[requestIndex].status = 'rejected';
    requests[requestIndex].updatedAt = new Date().toISOString();
    
    await fs.writeJson('./data/n8n_requests.json', requests, { spaces: 2 });
    adminLog('SUCCESS', `Request ${requestId} successfully rejected`);
    
    return { success: true };
  } catch (error) {
    adminLog('ERROR', `Failed to reject request ${requestId}`, {
      error: error.message,
      stack: error.stack
    });
    return { success: false, message: error.message };
  }
}

/**
 * Mengirim notifikasi untuk request baru
 */
async function sendNewRequestNotification(requestData, sendMessage) {
  adminLog('INFO', `Sending new request notification for: ${requestData.id}`);
  try {
    const config = await getConfig();
    adminLog('SUCCESS', 'Config loaded for notification');
    
    const message = `*🔔 NEW N8N REQUEST*\n\n` +
                   `📧 Email: ${requestData.email}\n` +
                   `📱 Phone: ${requestData.phoneNumber}\n` +
                   `🏷️ Name: ${requestData.name}\n` +
                   `📝 Reason: ${requestData.reason}\n` +
                   `🆔 Request ID: ${requestData.id}\n\n` +
                   `⚡ Admin Commands:\n` +
                   `• !approve ${requestData.id}\n` +
                   `• !reject ${requestData.id}`;

    // Kirim ke semua admin (DM)
    const adminNumbers = Array.isArray(config?.whatsapp?.admin_numbers) ? config.whatsapp.admin_numbers : (config?.whatsapp?.admin_number ? [config.whatsapp.admin_number] : []);
    for (const adminNum of adminNumbers.filter(Boolean)) {
      try {
        await sendMessage(adminNum, message);
      } catch (e) {
        adminLog('ERROR', 'Failed sending notification to admin', { adminNum, error: e.message });
      }
    }

    return { success: true };
  } catch (error) {
    adminLog('ERROR', 'Failed sending new request notification', { error: error.message });
    return { success: false, message: error.message };
  }
}

// Ekspor fungsi

module.exports = {
  executeAdminCommand,
  approveN8NRequest,
  rejectN8NRequest,
  sendNewRequestNotification,
};