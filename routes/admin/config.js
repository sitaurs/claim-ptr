const express = require('express');
const router = express.Router();
const { requireAdminAuth } = require('../../middleware/auth');
const { getConfig, updateConfigSection, updateServerTemplate, updateConfigFromForm } = require('../../services/config');
const { checkBotStatus, executeAdminCommand } = require('../../services/whatsapp-service');
const fs = require('fs-extra');

// Halaman konfigurasi
router.get('/config', requireAdminAuth, async (req, res) => {
  try {
    const config = await getConfig();
    res.render('admin/config', { 
      config,
      success: req.query.success || null,
      error: req.query.error || null,
      active: 'config'
    });
  } catch (error) {
    console.error('Error loading config page:', error);
    res.render('admin/config', { 
      config: {
        server: { admin_session_secret: '' },
        whatsapp: { group_id: '', auto_start: false, admin_commands: [] },
        server_templates: {
          nodejs: { egg: 15, docker_image: '', startup: '', limits: { memory: 1024, disk: 2048, cpu: 100, io: 500 } },
          python: { egg: 16, docker_image: '', startup: '', limits: { memory: 1024, disk: 2048, cpu: 100, io: 500 } }
        }
      },
      error: 'Gagal memuat konfigurasi',
      active: 'config'
    });
  }
});

// POST handler untuk form config
router.post('/config', requireAdminAuth, async (req, res) => {
  try {
    console.log('Received config form data:', req.body);
    
    // Update config using the new form-aware function
    await updateConfigFromForm(req.body);
    
    res.redirect('/admin/config?success=Konfigurasi berhasil disimpan');
  } catch (error) {
    console.error('Error updating config:', error);
    res.redirect('/admin/config?error=Gagal menyimpan konfigurasi: ' + error.message);
  }
});

// API untuk memperbarui konfigurasi
router.put('/api/config/:section', requireAdminAuth, async (req, res) => {
  try {
    const { section } = req.params;
    const data = req.body;
    
    await updateConfigSection(section, data);
    res.json({ success: true, message: `Konfigurasi ${section} berhasil diperbarui` });
  } catch (error) {
    console.error(`Error updating config ${req.params.section}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API untuk memperbarui template server
router.put('/api/config/template/:type', requireAdminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const data = req.body;
    
    await updateServerTemplate(type, data);
    res.json({ success: true, message: `Template ${type} berhasil diperbarui` });
  } catch (error) {
    console.error(`Error updating template ${req.params.type}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API untuk status WhatsApp bot
router.get('/api/whatsapp/status', requireAdminAuth, async (req, res) => {
  try {
    const status = await checkBotStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking WhatsApp bot status:', error);
    res.status(500).json({ online: false, error: error.message });
  }
});

// API untuk admin commands WhatsApp
router.post('/api/whatsapp/command', requireAdminAuth, async (req, res) => {
  try {
    const { command, params } = req.body;
    
    if (!command) {
      return res.status(400).json({ success: false, message: 'Command diperlukan' });
    }
    
    const result = await executeAdminCommand(command, params);
    res.json(result);
  } catch (error) {
    console.error('Error executing WhatsApp command:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// API untuk menyimpan template server
router.post('/template/:type', requireAdminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { egg, docker_image, startup, memory, disk, cpu, io, env_keys, env_values } = req.body;
    
    if (!['nodejs', 'python'].includes(type)) {
      return res.redirect('/admin/server-templates?error=' + encodeURIComponent('Tipe template tidak valid'));
    }

    // Build environment object from arrays
    const environment = {};
    if (env_keys && env_values) {
      const keys = Array.isArray(env_keys) ? env_keys : [env_keys];
      const values = Array.isArray(env_values) ? env_values : [env_values];
      
      keys.forEach((key, index) => {
        if (key && values[index]) {
          environment[key] = values[index];
        }
      });
    }

    const templateData = {
      egg: parseInt(egg),
      docker_image,
      ...(startup && startup.trim() ? { startup } : {}),
      limits: {
        memory: parseInt(memory),
        disk: parseInt(disk),
        cpu: parseInt(cpu),
        io: parseInt(io),
        swap: 0
      },
      feature_limits: {
        databases: 1,
        allocations: 1,
        backups: 1
      },
      environment
    };

    const config = await getConfig();
    config.server_templates[type] = templateData;
    
    await fs.writeJson('./data/config.json', config, { spaces: 2 });
    
    res.redirect('/admin/server-templates?success=' + encodeURIComponent(`Template ${type} berhasil disimpan`));
  } catch (error) {
    console.error('Error saving template:', error);
    res.redirect('/admin/server-templates?error=' + encodeURIComponent('Gagal menyimpan template'));
  }
});

// API untuk test template
router.post('/template/:type/test', requireAdminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['nodejs', 'python'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipe template tidak valid' });
    }

    const { createTestServer } = require('../../services/pterodactyl');
    const result = await createTestServer(type);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing template:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
