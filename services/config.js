/**
 * CONFIG SERVICE
 * 
 * Service untuk mengelola konfigurasi aplikasi yang disimpan di config.json
 * 
 * CATATAN PENTING:
 * - File ini HANYA untuk konfigurasi server templates (CPU, RAM, disk, egg ID, dll)
 * - API keys, URLs, dan credentials sensitif HARUS di file .env
 * - Jangan simpan informasi sensitif di config.json
 * 
 * Struktur config.json:
 * - server: session secret dan konfigurasi server umum
 * - whatsapp: group ID dan pengaturan bot
 * - server_templates: template untuk pembuatan server (nodejs, python, dll)
 */

const fs = require('fs-extra');
const path = require('path');

const CONFIG_FILE_PATH = path.join(__dirname, '../data/config.json');

// Mutex untuk write operations
let writeQueue = Promise.resolve();

// Function untuk logging dengan timestamp
function configLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [CONFIG][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

/**
 * Race-safe write operation
 */
async function safeWriteConfig(config) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        configLog('DEBUG', 'Writing config to file...');
        await fs.writeJson(CONFIG_FILE_PATH, config, { spaces: 2 });
        configLog('SUCCESS', 'Config written successfully');
        resolve();
      } catch (error) {
        configLog('ERROR', 'Failed to write config', { error: error.message });
        reject(error);
      }
    });
  });
}

/**
 * Set nested object property by path
 */
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return obj;
}

/**
 * Mendapatkan seluruh konfigurasi
 */
async function getConfig() {
  configLog('INFO', 'Reading configuration file...');
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      configLog('WARNING', 'Configuration file not found, creating default...');
      const defaultConfig = {
        server: {
          port: 3000,
          base_url: process.env.BASE_URL || 'http://localhost:3000',
          admin_session_secret: process.env.ADMIN_SESSION_SECRET || 'default_secret_key'
        },
        whatsapp: {
          admin_number: '',
          group_id: process.env.WHATSAPP_GROUP_ID || '',
          auto_start: true
        },
        bot_url: 'http://localhost:3001',
        email: {
          smtp_host: '',
          smtp_port: 587,
          smtp_user: '',
          smtp_password: ''
        },
        server_templates: {
          nodejs: {
            name: 'Node.js Server',
            description: 'Template untuk aplikasi Node.js',
            egg: 15,
            docker_image: 'ghcr.io/pterodactyl/yolks:nodejs_18',
            startup: 'npm start',
            limits: {
              memory: 1024,
              swap: 0,
              disk: 2048,
              io: 500,
              cpu: 100
            },
            feature_limits: {
              databases: 1,
              allocations: 1,
              backups: 1
            },
            environment: {
              STARTUP_CMD: 'npm start',
              NODE_VERSION: '18'
            }
          },
          python: {
            name: 'Python Server',
            description: 'Template untuk aplikasi Python',
            egg: 16,
            docker_image: 'ghcr.io/pterodactyl/yolks:python_3.9',
            startup: 'python3 app.py',
            limits: {
              memory: 1024,
              swap: 0,
              disk: 2048,
              io: 500,
              cpu: 100
            },
            feature_limits: {
              databases: 1,
              allocations: 1,
              backups: 1
            },
            environment: {
              STARTUP_FILE: 'app.py',
              PYTHON_VERSION: '3.9'
            }
          }
        }
      };
      
      await safeWriteConfig(defaultConfig);
      configLog('SUCCESS', 'Default configuration created');
      return defaultConfig;
    }
    
    const config = await fs.readJson(CONFIG_FILE_PATH);

    // Overlay environment variables (do not persist)
    config.server = config.server || {};
    if (process.env.ADMIN_SESSION_SECRET) config.server.admin_session_secret = process.env.ADMIN_SESSION_SECRET;
    if (process.env.BASE_URL) config.server.base_url = process.env.BASE_URL;

    config.whatsapp = config.whatsapp || {};
    if (process.env.WHATSAPP_GROUP_ID) config.whatsapp.group_id = process.env.WHATSAPP_GROUP_ID;
    if (process.env.ADMIN_NUMBERS) {
      config.whatsapp.admin_numbers = process.env.ADMIN_NUMBERS.split(',').map(n=>n.trim());
    }

    configLog('SUCCESS', 'Configuration loaded successfully', {
      sections: Object.keys(config),
      fileSize: JSON.stringify(config).length
    });
    return config;
  } catch (error) {
    configLog('ERROR', 'Failed to read configuration', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Mendapatkan bagian spesifik dari konfigurasi
 * @param {string} section - Nama bagian (server, whatsapp, server_templates)
 */
// removed strict version to avoid duplicate; tolerant version is defined below

/**
 * Mendapatkan bagian spesifik dari konfigurasi
 * @param {string} section - Nama bagian (server, whatsapp, server_templates)
 */
async function getConfigSection(section) {
  configLog('INFO', `Reading config section: ${section}`);
  try {
    const config = await getConfig();
    
    if (!config[section]) {
      configLog('WARNING', `Config section '${section}' not found, returning empty object`);
      return {};
    }
    
    configLog('SUCCESS', `Config section '${section}' loaded`, config[section]);
    return config[section];
  } catch (error) {
    configLog('ERROR', `Failed to read config section '${section}'`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Memperbarui konfigurasi dari form data (supports nested keys)
 * @param {object} formData - Data dari form dengan dot notation keys
 */
async function updateConfigFromForm(formData) {
  configLog('INFO', 'Updating config from form data', formData);
  try {
    const config = await getConfig();
    
    // Process each form field
    for (const [key, value] of Object.entries(formData)) {
      if (value !== undefined && value !== '') {
        // Handle nested keys like 'pterodactyl.panel_url'
        setNestedProperty(config, key, value);
        configLog('DEBUG', `Updated config key: ${key}`, { value });
      }
    }
    
    await safeWriteConfig(config);
    configLog('SUCCESS', 'Config updated from form data');
    return config;
  } catch (error) {
    configLog('ERROR', 'Failed to update config from form', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Memperbarui bagian spesifik dari konfigurasi
 * @param {string} section - Nama bagian (server, whatsapp, server_templates)
 * @param {object} data - Data konfigurasi baru
 */
async function updateConfigSection(section, data) {
  configLog('INFO', `Updating config section: ${section}`, data);
  try {
    const config = await getConfig();
    
    if (!config[section]) {
      configLog('WARNING', `Config section '${section}' not found, creating new section`);
      config[section] = {};
    }
    
    // Update bagian konfigurasi
    config[section] = { ...config[section], ...data };
    
    // Simpan konfigurasi yang diperbarui
    await safeWriteConfig(config);
    
    configLog('SUCCESS', `Config section '${section}' updated`, config[section]);
    return config[section];
  } catch (error) {
    configLog('ERROR', `Failed to update config section '${section}'`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Memperbarui template server
 * @param {string} serverType - Tipe server (nodejs, python)
 * @param {object} template - Data template baru
 */
async function updateServerTemplate(serverType, template) {
  configLog('INFO', `Updating server template: ${serverType}`, template);
  try {
    const config = await getConfig();
    
    if (!config.server_templates) {
      config.server_templates = {};
    }
    
    // Update template server
    config.server_templates[serverType] = { 
      ...config.server_templates[serverType], 
      ...template 
    };
    
    // Simpan konfigurasi yang diperbarui
    await safeWriteConfig(config);
    
    configLog('SUCCESS', `Server template '${serverType}' updated`, config.server_templates[serverType]);
    return config.server_templates[serverType];
  } catch (error) {
    configLog('ERROR', `Failed to update server template '${serverType}'`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Mendapatkan template server berdasarkan tipe
 * @param {string} serverType - Tipe server (nodejs, python)
 */
async function getServerTemplate(serverType) {
  configLog('INFO', `Reading server template: ${serverType}`);
  try {
    const config = await getConfig();
    
    if (!config.server_templates || !config.server_templates[serverType]) {
      configLog('ERROR', `Server template '${serverType}' not found`);
      throw new Error(`Template server '${serverType}' tidak ditemukan`);
    }
    
    configLog('SUCCESS', `Server template '${serverType}' loaded`, config.server_templates[serverType]);
    return config.server_templates[serverType];
  } catch (error) {
    configLog('ERROR', `Failed to read server template '${serverType}'`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  getConfig,
  getConfigSection,
  updateConfigSection,
  updateConfigFromForm,
  updateServerTemplate,
  getServerTemplate
};