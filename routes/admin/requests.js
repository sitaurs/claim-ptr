const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../../middleware/auth');
const requestService = require('../../services/request');
const whatsappService = require('../../services/whatsapp');

// Halaman daftar requests
router.get('/requests', requireAdminAuth, async (req, res) => {
  try {
    const requests = await requestService.getAllRequests();
    res.render('admin/requests', { 
      requests,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error mendapatkan requests:', error);
    res.render('admin/requests', { requests: [], error: 'Gagal memuat data requests' });
  }
});

// API untuk mendapatkan semua request JSON
router.get('/api/list', requireAdminAuth, async (req, res) => {
  try {
    const requests = await requestService.getAllRequests();
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error mendapatkan requests:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mendapatkan requests' });
  }
});

// Mendapatkan request berdasarkan ID
router.get('/api/:id', requireAdminAuth, async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request tidak ditemukan' });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    console.error(`Error mendapatkan request ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mendapatkan request' });
  }
});

// Memperbarui status request
router.put('/api/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const { processed } = req.body;
    
    if (processed === undefined) {
      return res.status(400).json({ success: false, message: 'Status processed diperlukan' });
    }
    
    const updatedRequest = await requestService.updateRequestStatus(req.params.id, processed);
    res.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error(`Error memperbarui status request ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memperbarui status request' });
  }
});

// Menandai semua request sebagai diproses
router.put('/api/mark-all-processed', requireAdminAuth, async (req, res) => {
  try {
    await requestService.markAllRequestsAsProcessed();
    res.json({ success: true, message: 'Semua request berhasil ditandai sebagai diproses' });
  } catch (error) {
    console.error('Error menandai semua request sebagai diproses:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menandai semua request' });
  }
});

// Menghapus request berdasarkan ID
router.delete('/api/:id', requireAdminAuth, async (req, res) => {
  try {
    await requestService.deleteRequest(req.params.id);
    res.json({ success: true, message: 'Request berhasil dihapus' });
  } catch (error) {
    console.error(`Error menghapus request ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus request' });
  }
});

// Menghapus semua request
router.delete('/api/clear-all', requireAdminAuth, async (req, res) => {
  try {
    await requestService.clearAllRequests();
    res.json({ success: true, message: 'Semua request berhasil dihapus' });
  } catch (error) {
    console.error('Error menghapus semua request:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus semua request' });
  }
});

// Mengirim notifikasi WhatsApp untuk request tertentu
router.post('/api/:id/notify', requireAdminAuth, async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request tidak ditemukan' });
    }
    
    // Mengirim notifikasi WhatsApp
    await whatsappService.sendJsonRequestNotification(request);
    
    res.json({ success: true, message: 'Notifikasi WhatsApp berhasil dikirim' });
  } catch (error) {
    console.error(`Error mengirim notifikasi untuk request ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim notifikasi' });
  }
});

// Mengirim notifikasi WhatsApp untuk semua request yang belum diproses
router.post('/api/notify-all', requireAdminAuth, async (req, res) => {
  try {
    const requests = await requestService.getAllRequests();
    const unprocessedRequests = requests.filter(request => !request.processed);
    
    if (unprocessedRequests.length === 0) {
      return res.json({ success: true, message: 'Tidak ada request yang belum diproses' });
    }
    
    // Mengirim notifikasi WhatsApp untuk setiap request yang belum diproses
    const notificationPromises = unprocessedRequests.map(request => 
      whatsappService.sendJsonRequestNotification(request)
    );
    
    await Promise.all(notificationPromises);
    
    res.json({ 
      success: true, 
      message: `Notifikasi WhatsApp berhasil dikirim untuk ${unprocessedRequests.length} request` 
    });
  } catch (error) {
    console.error('Error mengirim notifikasi untuk semua request:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim notifikasi' });
  }
});

// Mengirim pesan WhatsApp broadcast
router.post('/api/broadcast', requireAdminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Pesan diperlukan' });
    }
    
    // Mengirim pesan broadcast
    await whatsappService.sendBroadcast(message);
    
    res.json({ success: true, message: 'Pesan broadcast berhasil dikirim' });
  } catch (error) {
    console.error('Error mengirim pesan broadcast:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim pesan broadcast' });
  }
});

// Mengirim pesan WhatsApp ke nomor tertentu
router.post('/api/send-message', requireAdminAuth, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor telepon dan pesan diperlukan' 
      });
    }
    
    // Mengirim pesan ke nomor tertentu
    await whatsappService.sendMessage(phoneNumber, message);
    
    res.json({ success: true, message: 'Pesan berhasil dikirim' });
  } catch (error) {
    console.error('Error mengirim pesan:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengirim pesan' });
  }
});

module.exports = router;