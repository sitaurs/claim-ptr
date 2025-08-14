const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const { requireAdminAuth, adminLogin, adminLogout } = require('../middleware/auth');

// Include admin routes
const adminRequestsRouter = require('./admin/requests');
const adminConfigRouter = require('./admin/config');

// Halaman utama
router.get('/', (req, res) => {
  res.render('index');
});

// Halaman klaim server
router.get('/claim', (req, res) => {
  res.render('claim');
});

// Halaman verifikasi OTP
router.get('/verify', (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.redirect('/claim');
  }
  
  res.render('verify', { phone });
});

// Halaman pembuatan akun
router.get('/create-account', (req, res) => {
  const { phone, verified } = req.query;
  
  if (!phone || verified !== 'true') {
    return res.redirect('/claim');
  }
  
  res.render('create-account', { phone });
});

// Halaman pembuatan server
router.get('/create-server', (req, res) => {
  const { phone, email } = req.query;
  
  if (!phone || !email) {
    return res.redirect('/claim');
  }
  
  res.render('create-server', { phone, email });
});

// Halaman sukses
router.get('/success', (req, res) => {
  const { email, server, type, panel } = req.query;
  
  if (!email || !server || !type || !panel) {
    return res.redirect('/claim');
  }
  
  res.render('success', { email, server, type, panel });
});

// Halaman request N8n
router.get('/request-n8n', (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.redirect('/claim');
  }
  
  res.render('request-n8n', { phone });
});

// Halaman admin
router.get('/admin', (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

// Login admin
router.post('/admin/login', adminLogin);

// Logout admin
router.get('/admin/logout', adminLogout);

// Halaman dashboard admin
router.get('/admin/dashboard', requireAdminAuth, async (req, res) => {
  try {
    const users = await fs.readJson('./data/users.json').catch(() => []);
    const servers = await fs.readJson('./data/servers.json').catch(() => []);
    const n8nRequests = await fs.readJson('./data/n8n_requests.json').catch(() => []);

    // Add latest users/servers for dashboard cards
    const latestUsers = Array.isArray(users) ? users.slice(-5).reverse() : [];
    const latestServers = Array.isArray(servers) ? servers.slice(-5).reverse() : [];

    res.render('admin/dashboard', {
      userCount: users.length,
      serverCount: servers.length,
      n8nRequestCount: n8nRequests.length,
      latestUsers,
      latestServers,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.render('admin/dashboard', {
      userCount: 0,
      serverCount: 0,
      n8nRequestCount: 0,
      latestUsers: [],
      latestServers: [],
      error: 'Gagal memuat data dashboard'
    });
  }
});

// Halaman manajemen promosi
router.get('/admin/promotions', requireAdminAuth, async (req, res) => {
  try {
    const promotions = await fs.readJson('./data/promotions.json').catch(() => []);
    const config = await fs.readJson('./data/config.json').catch(() => ({ whatsapp: {} }));
    res.render('admin/promotions', { 
      promotions,
      groupId: (config.whatsapp && config.whatsapp.group_id) || '',
      success: req.query.success || null,
      error: req.query.error || null 
    });
  } catch (error) {
    console.error('Error loading promotions page:', error);
    res.render('admin/promotions', { promotions: [], groupId: '', error: 'Gagal memuat data promosi' });
  }
});

// Halaman manajemen permintaan N8n
router.get('/admin/n8n-requests', requireAdminAuth, async (req, res) => {
  try {
    const requests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
    res.render('admin/n8n-requests', { 
      requests,
      success: req.query.success || null,
      error: req.query.error || null 
    });
  } catch (error) {
    console.error('Error loading N8n requests page:', error);
    res.render('admin/n8n-requests', { requests: [], error: 'Gagal memuat data permintaan N8n' });
  }
});

// Halaman manajemen pengguna
router.get('/admin/users', requireAdminAuth, async (req, res) => {
  try {
    const users = await fs.readJson('./data/users.json').catch(() => []);
    const servers = await fs.readJson('./data/servers.json').catch(() => []);
    res.render('admin/users', { 
      users, 
      servers,
      success: req.query.success || null,
      error: req.query.error || null 
    });
  } catch (error) {
    console.error('Error loading users page:', error);
    res.render('admin/users', { users: [], servers: [], error: 'Gagal memuat data pengguna' });
  }
});

// Halaman konfigurasi template server
router.get('/admin/server-templates', requireAdminAuth, async (req, res) => {
  try {
    const config = await fs.readJson('./data/config.json');
    res.render('admin/server-templates', { 
      config,
      success: req.query.success || null,
      error: req.query.error || null 
    });
  } catch (error) {
    console.error('Error loading server templates page:', error);
    res.render('admin/server-templates', { 
      config: { server_templates: { nodejs: {}, python: {} } }, 
      error: 'Gagal memuat konfigurasi template server' 
    });
  }
});

// Admin sub-routes
router.use('/admin', adminRequestsRouter);
router.use('/admin', adminConfigRouter);

module.exports = router;