const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { requireAdminAuth } = require('../../middleware/auth');
const { sendMessage } = require('../../services/whatsapp');

const N8N_REQUESTS_PATH = path.join(__dirname, '../../data/n8n_requests.json');

// Helper: read requests safely
async function readRequests() {
  return fs.readJson(N8N_REQUESTS_PATH).catch(() => []);
}

// Helper: write requests safely
async function writeRequests(requests) {
  await fs.writeJson(N8N_REQUESTS_PATH, requests, { spaces: 2 });
}

// Mark request completed and send WA credentials
router.post('/n8n/:id/complete', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { n8nUrl, username, password, note } = req.body;

    if (!n8nUrl || !username || !password) {
      return res.status(400).json({ success: false, message: 'n8nUrl, username, dan password wajib diisi' });
    }

    const requests = await readRequests();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Request tidak ditemukan' });
    }

    const reqItem = requests[idx];

    // Update status and store issued credentials
    requests[idx] = {
      ...reqItem,
      status: 'completed',
      processed: true,
      completedAt: new Date().toISOString(),
      credentials: { n8nUrl, username, note: note || '' }
    };
    await writeRequests(requests);

    // Send WhatsApp message to requester
    const message = `*MOOTERACT HUB - Server N8n Siap*\n\n` +
      `Server N8n Anda sudah selesai dibuat. Berikut detail aksesnya:\n\n` +
      `URL: ${n8nUrl}\n` +
      `User: ${username}\n` +
      `Password: ${password}\n` +
      `${note ? `\nCatatan: ${note}\n\n` : '\n'}` +
      `Silakan login dan segera ubah password Anda. Terima kasih!`;

    await sendMessage(reqItem.phoneNumber, message);

    res.json({ success: true, message: 'Request ditandai selesai dan pesan WhatsApp dikirim' });
  } catch (error) {
    console.error('Error complete N8n request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;


