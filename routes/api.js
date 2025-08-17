const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const { sendOTPToPhone, verifyOTP, isPhoneRegistered } = require('../services/otp');
const { createUserAndServer, getUserByPhone } = require('../services/user');
const { getAllPromotions, addPromotion, updatePromotion, deletePromotion, togglePromotion } = require('../services/promotion');
const { sendJsonRequestNotification } = require('../services/whatsapp-service');
const { sendNewRequestNotification } = require('../services/whatsapp-admin');

// Endpoint untuk mengirim OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Nomor telepon diperlukan' });
    }
    
    // Kirim OTP
    const result = await sendOTPToPhone(phoneNumber);
    return res.json(result);
  } catch (error) {
    console.error('Error API send-otp:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim OTP' });
  }
});

// Endpoint untuk verifikasi OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Nomor telepon dan OTP diperlukan' });
    }
    
    // Verifikasi OTP
    const result = await verifyOTP(phoneNumber, otp);
    
    if (result.valid) {
      // Cek apakah nomor sudah terdaftar
      const registered = await isPhoneRegistered(phoneNumber);
      return res.json({ 
        success: true, 
        message: 'OTP terverifikasi', 
        registered 
      });
    } else {
      return res.json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error API verify-otp:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat verifikasi OTP' });
  }
});

// Endpoint untuk membuat akun dan server
router.post('/create-account', async (req, res) => {
  try {
    const { phoneNumber, email, password, firstName, lastName, serverName, serverType, serverVersion } = req.body;
    
    // Validasi input
    if (!phoneNumber || !email || !password || !serverName || !serverType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field diperlukan (phoneNumber, email, password, serverName, serverType)' 
      });
    }
    
    // Cek apakah nomor sudah terdaftar
    const registered = await isPhoneRegistered(phoneNumber);
    if (registered) {
      return res.status(400).json({ success: false, message: 'Nomor telepon sudah terdaftar' });
    }
    
    // Buat user dan server
    const userData = { phoneNumber, email, password, firstName, lastName };
    const serverData = { name: serverName, type: serverType, version: serverVersion };
    
    const result = await createUserAndServer(userData, serverData);
    
    return res.json(result);
  } catch (error) {
    console.error('Error API create-account:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Terjadi kesalahan saat membuat akun dan server' 
    });
  }
});

// Endpoint untuk request server N8n
router.post('/request-n8n', async (req, res) => {
  try {
    const { phoneNumber, email, name, reason } = req.body;
    
    // Validasi input
    if (!phoneNumber || !email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor telepon, email, dan nama diperlukan' 
      });
    }
    
    // Simpan request ke file JSON
    const requests = await fs.readJson('./data/n8n_requests.json').catch(() => []);
    
    const newRequest = {
      id: Date.now().toString(),
      phoneNumber,
      email,
      name,
      reason: reason || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    requests.push(newRequest);
    await fs.writeJson('./data/n8n_requests.json', requests, { spaces: 2 });
    
    // Kirim notifikasi WhatsApp ke admin
    try {
      const { sendMessage } = require('../services/whatsapp');
      await sendNewRequestNotification(newRequest, sendMessage);
    } catch (error) {
      console.error('Error mengirim notifikasi WhatsApp:', error);
    }
    
    return res.json({ 
      success: true, 
      message: 'Permintaan server N8n berhasil dikirim. Admin akan menghubungi Anda segera.' 
    });
  } catch (error) {
    console.error('Error API request-n8n:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim permintaan' });
  }
});

// === API Promosi ===

// Mendapatkan semua promosi
router.get('/promotions', async (req, res) => {
  try {
    const promotions = await getAllPromotions();
    return res.json({ success: true, promotions });
  } catch (error) {
    console.error('Error API get promotions:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengambil data promosi' });
  }
});

// Menambahkan promosi baru
router.post('/promotions', async (req, res) => {
  try {
    const { groupId, message, intervalMinutes } = req.body;
    
    if (!groupId || !message || !intervalMinutes) {
      return res.status(400).json({ 
        success: false, 
        message: 'Group ID, pesan, dan interval diperlukan' 
      });
    }
    
    const result = await addPromotion({ groupId, message, intervalMinutes: parseInt(intervalMinutes) });
    return res.json(result);
  } catch (error) {
    console.error('Error API add promotion:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menambahkan promosi' });
  }
});

// Mengupdate promosi
router.put('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId, message, intervalMinutes } = req.body;
    
    const updateData = {};
    if (groupId) updateData.groupId = groupId;
    if (message) updateData.message = message;
    if (intervalMinutes) updateData.intervalMinutes = parseInt(intervalMinutes);
    
    const result = await updatePromotion(id, updateData);
    return res.json(result);
  } catch (error) {
    console.error('Error API update promotion:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengupdate promosi' });
  }
});

// Menghapus promosi
router.delete('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deletePromotion(id);
    return res.json(result);
  } catch (error) {
    console.error('Error API delete promotion:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus promosi' });
  }
});

// Toggle status aktif promosi
router.post('/promotions/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await togglePromotion(id);
    return res.json(result);
  } catch (error) {
    console.error('Error API toggle promotion:', error);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengubah status promosi' });
  }
});

module.exports = { router };