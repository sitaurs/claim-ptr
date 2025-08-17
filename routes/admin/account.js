const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../../middleware/auth');
const { changeAdminCredentials } = require('../../services/admin');

// Render account page
router.get('/account', requireAdminAuth, (req, res) => {
  res.render('admin/account', {
    success: req.query.success || null,
    error: req.query.error || null,
    active: 'account',
    username: req.session?.adminUsername || 'admin'
  });
});

// Handle credentials update
router.post('/account', requireAdminAuth, async (req, res) => {
  try {
    const adminId = req.session.adminId;
    const { currentPassword, newUsername, newPassword } = req.body;
    const result = await changeAdminCredentials(adminId, currentPassword, newUsername, newPassword);
    if (result.success && newUsername) {
      req.session.adminUsername = newUsername;
    }
    const qs = result.success ? `success=${encodeURIComponent(result.message)}` : `error=${encodeURIComponent(result.message)}`;
    res.redirect(`/admin/account?${qs}`);
  } catch (error) {
    res.redirect(`/admin/account?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;
