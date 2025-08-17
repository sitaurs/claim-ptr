const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { requireAdminAuth } = require('../../middleware/auth');

// Daftar file data yang akan di-flush
const DATA_FILES = [
  path.join(__dirname, '../../data/n8n_requests.json'),
  path.join(__dirname, '../../data/requests.json'),
  path.join(__dirname, '../../data/users.json'),
  path.join(__dirname, '../../data/servers.json'),
  path.join(__dirname, '../../data/promotions.json')
];

// Helper untuk flush file menjadi array kosong
async function flushDataFiles() {
  for (const file of DATA_FILES) {
    try {
      await fs.writeJson(file, [], { spaces: 2 });
    } catch (err) {
      // Jika file tidak ada, abaikan; buat kosong baru
      if (err.code === 'ENOENT') {
        await fs.writeJson(file, [], { spaces: 2 });
      } else {
        throw err;
      }
    }
  }
}

// Endpoint POST /admin/flush
router.post('/flush', requireAdminAuth, async (req, res) => {
  try {
    await flushDataFiles();
    res.json({ success: true, message: 'Semua data berhasil dihapus (flush)' });
  } catch (error) {
    console.error('Error flushing data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Halaman maintenance
router.get('/maintenance', requireAdminAuth, (req, res) => {
  res.render('admin/maintenance', {
    success: req.query.success || null,
    error: req.query.error || null,
    active: 'maintenance'
  });
});

module.exports = router;
