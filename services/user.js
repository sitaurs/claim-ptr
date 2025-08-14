const fs = require('fs-extra');
const { createUser, createServer, PANEL_URL } = require('./pterodactyl');
const { sendAccountDetails } = require('../whatsapp/bot');

// Fungsi untuk menyimpan data pengguna
async function saveUser(userData) {
  try {
    const users = await fs.readJson('./data/users.json');
    users.push(userData);
    await fs.writeJson('./data/users.json', users, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error menyimpan data pengguna:', error);
    return false;
  }
}

// Fungsi untuk menyimpan data server
async function saveServer(serverData) {
  try {
    const servers = await fs.readJson('./data/servers.json');
    servers.push(serverData);
    await fs.writeJson('./data/servers.json', servers, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error menyimpan data server:', error);
    return false;
  }
}

// Fungsi untuk membuat akun pengguna dan server
async function createUserAndServer(userData, serverData) {
  try {
    // Membuat user di Pterodactyl
    const pterodactylUser = await createUser(
      userData.email,
      userData.username || userData.email.split('@')[0],
      userData.firstName || 'User',
      userData.lastName || 'Mooteract',
      userData.password
    );
    
    // Menyimpan data user
    const user = {
      ...userData,
      pterodactylId: pterodactylUser.id,
      createdAt: new Date().toISOString()
    };
    await saveUser(user);
    
    // Membuat server di Pterodactyl
    const pterodactylServer = await createServer(
      pterodactylUser.id,
      serverData.name,
      serverData.type
    );
    
    // Menyimpan data server
    const server = {
      ...serverData,
      userId: user.pterodactylId,
      pterodactylId: pterodactylServer.id,
      identifier: pterodactylServer.identifier,
      createdAt: new Date().toISOString()
    };
    await saveServer(server);
    
    // Kirim detail akun via WhatsApp
    await sendAccountDetails(
      userData.phoneNumber,
      userData.email,
      userData.password,
      serverData.name,
      serverData.type,
      PANEL_URL
    );
    
    return {
      success: true,
      user: pterodactylUser,
      server: pterodactylServer,
      panelUrl: PANEL_URL
    };
  } catch (error) {
    console.error('Error membuat akun dan server:', error);
    return {
      success: false,
      message: error.message || 'Terjadi kesalahan saat membuat akun dan server'
    };
  }
}

// Fungsi untuk mendapatkan data pengguna berdasarkan nomor telepon
async function getUserByPhone(phoneNumber) {
  try {
    const users = await fs.readJson('./data/users.json');
    return users.find(user => user.phoneNumber === phoneNumber) || null;
  } catch (error) {
    console.error('Error mendapatkan data pengguna:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan server yang dimiliki pengguna
async function getUserServers(userId) {
  try {
    const servers = await fs.readJson('./data/servers.json');
    return servers.filter(server => server.userId === userId);
  } catch (error) {
    console.error('Error mendapatkan server pengguna:', error);
    return [];
  }
}

module.exports = {
  saveUser,
  saveServer,
  createUserAndServer,
  getUserByPhone,
  getUserServers
};