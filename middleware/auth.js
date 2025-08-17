require('dotenv').config();
const session = require('express-session');
const { verifyAdminCredentials } = require('../services/admin');
const fs = require('fs-extra');
const path = require('path');

// Mendapatkan konfigurasi dengan safe loading
let config;
try {
  const configPath = path.join(__dirname, '../data/config.json');
  if (fs.existsSync(configPath)) {
    config = fs.readJsonSync(configPath);
  } else {
    config = {};
  }
} catch (error) {
  console.error('Error membaca file konfigurasi:', error);
  config = {};
}

// Middleware untuk mengatur sesi admin
const setupAdminSession = session({
  secret: process.env.ADMIN_SESSION_SECRET || config.server?.admin_session_secret || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 jam
  }
});

// Middleware untuk memeriksa autentikasi admin
const requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    if (req.xhr) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    } else {
      return res.redirect('/admin');
    }
  }
};

// Middleware untuk login admin
const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.render('admin/login', { error: 'Username dan password diperlukan' });
    }
    
    console.log(`Mencoba login dengan username: ${username}`);
    const result = await verifyAdminCredentials(username, password);
    
    if (result.valid) {
      // Set session
      req.session.adminId = result.admin.id;
      req.session.adminUsername = result.admin.username;
      
      console.log(`Login berhasil untuk admin: ${username}`);
      return res.redirect('/admin/dashboard');
    } else {
      console.log(`Login gagal untuk username: ${username}, pesan: ${result.message}`);
      return res.render('admin/login', { error: result.message });
    }
  } catch (error) {
    console.error('Error login admin:', error);
    return res.render('admin/login', { error: 'Terjadi kesalahan saat login' });
  }
};

// Middleware untuk logout admin
const adminLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error saat logout:', err);
    }
    res.redirect('/admin');
  });
};

module.exports = {
  setupAdminSession,
  requireAdminAuth,
  adminLogin,
  adminLogout
};