require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const { getConfig } = require('./config');

// Function untuk logging dengan timestamp
function pteroLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [PTERODACTYL][${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

// Mendapatkan konfigurasi Pterodactyl
async function getPterodactylConfig() {
  try {
    // Hanya ambil dari .env (tidak dari config.json)
    const panelUrl = process.env.PANEL_URL;
    const apiKey = process.env.API_KEY;
    
    // Validasi URL panel
    if (!panelUrl || panelUrl === 'https://panel.example.com' || panelUrl === 'panel.example.com') {
      throw new Error('PANEL_URL tidak dikonfigurasi dengan benar. Set di file .env');
    }
    
    // Validasi API key
    if (!apiKey || apiKey.startsWith('ptla_your_') || apiKey === 'your_pterodactyl_api_key' || apiKey.length < 20) {
      throw new Error('API_KEY tidak dikonfigurasi dengan benar. Set di file .env');
    }
    
    pteroLog('SUCCESS', 'Pterodactyl config loaded from .env', { 
      panelUrl, 
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });
    
    return { panelUrl, apiKey };
  } catch (error) {
    pteroLog('ERROR', 'Failed to load Pterodactyl config', { error: error.message });
    throw error;
  }
}

// Membuat axios client dengan konfigurasi yang benar
async function createApiClient() {
  const { panelUrl, apiKey } = await getPterodactylConfig();
  
  return axios.create({
    baseURL: `${panelUrl.replace(/\/+$/, '')}/api/application`,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json'
    },
    timeout: 20000
  });
}

// Mendapatkan konfigurasi server dari config.json atau default
async function getServerConfig(serverType) {
  try {
    const config = await getConfig();
    const serverTemplate = config.server_templates?.[serverType];
    
    if (serverTemplate) {
      // Tambahkan fallback startup jika belum ada
      const withStartup = { ...serverTemplate };
      if (!withStartup.startup) {
        withStartup.startup = serverType === 'python' ? 'python3 app.py' : 'npm start';
      }
      pteroLog('DEBUG', `Using server template from config: ${serverType}`, withStartup);
      return withStartup;
    }
    
    // Fallback ke default config
    const defaultConfig = {
      nodejs: {
        name: 'Node.js Server',
        description: 'Template untuk aplikasi Node.js',
        egg: 16,
        docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
        startup: 'npm start',
        limits: { memory: 1024, swap: 0, disk: 2048, io: 500, cpu: 100 },
        feature_limits: { databases: 1, allocations: 1, backups: 1 },
        environment: { STARTUP_CMD: 'npm start', NODE_VERSION: '18' }
      },
      python: {
        name: 'Python Server',
        description: 'Template untuk aplikasi Python',
        egg: 17,
        docker_image: 'ghcr.io/parkervcp/yolks:python_3.13',
        startup: 'python3 app.py',
        limits: { memory: 1024, swap: 0, disk: 2048, io: 500, cpu: 100 },
        feature_limits: { databases: 1, allocations: 1, backups: 1 },
        environment: { STARTUP_FILE: 'app.py', PYTHON_VERSION: '3.13' }
      }
    };
    
    pteroLog('WARNING', `Using default config for: ${serverType}`);
    return defaultConfig[serverType] || defaultConfig.nodejs;
  } catch (error) {
    pteroLog('ERROR', `Failed to get server config: ${serverType}`, { error: error.message });
    throw error;
  }
}

// Resolve docker image berdasarkan pilihan versi
function resolveDockerImage(serverType, version, fallbackImage) {
  if (!version) return fallbackImage;
  if (serverType === 'nodejs') {
    const v = String(version).replace(/[^0-9]/g, '');
    if (!v) return fallbackImage;
    return `ghcr.io/parkervcp/yolks:nodejs_${v}`;
  }
  if (serverType === 'python') {
    const v = String(version).trim();
    if (!/^[0-9]+\.[0-9]+$/.test(v) && !/^[0-9]+$/.test(v)) return fallbackImage;
    return `ghcr.io/parkervcp/yolks:python_${v}`;
  }
  return fallbackImage;
}

// Fungsi untuk membuat user baru di Pterodactyl
async function createUser(email, username, firstName, lastName, password) {
  pteroLog('INFO', `Creating user: ${email}`, { username, firstName, lastName });
  
  try {
    const apiClient = await createApiClient();
    
    const payload = {
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      language: 'en',
      root_admin: false
    };
    
    pteroLog('DEBUG', 'Sending create user request to Pterodactyl', payload);
    
    const response = await apiClient.post('/users', payload);

    pteroLog('SUCCESS', `User created successfully: ${email}`, { 
      userId: response.data.attributes.id,
      userUuid: response.data.attributes.uuid
    });
    
    return response.data.attributes;
  } catch (error) {
    const errorDetail = error.response?.data?.errors?.[0]?.detail || 
                       error.response?.data?.message || 
                       error.message;
    
    pteroLog('ERROR', `Failed to create user: ${email}`, {
      error: errorDetail,
      status: error.response?.status,
      responseData: error.response?.data
    });
    
    throw new Error(errorDetail || `Failed to create user: ${email}`);
  }
}

// Fungsi untuk mendapatkan node dan allocation yang tersedia
async function getAvailableAllocation() {
  pteroLog('INFO', 'Getting available allocation...');
  
  try {
    const apiClient = await createApiClient();
    
    // Mendapatkan daftar node
    const nodesResponse = await apiClient.get('/nodes');
    const nodes = nodesResponse.data.data;

    if (nodes.length === 0) {
      throw new Error('Tidak ada node yang tersedia');
    }

    // Pilih node pertama (bisa dimodifikasi untuk load balancing)
    const node = nodes[0].attributes;
    pteroLog('DEBUG', `Using node: ${node.name}`, { nodeId: node.id });
    
    // Mendapatkan allocation yang tersedia di node tersebut
    const allocationsResponse = await apiClient.get(`/nodes/${node.id}/allocations`);
    const allocations = allocationsResponse.data.data;
    
    // Cari allocation yang belum digunakan
    const availableAllocation = allocations.find(alloc => !alloc.attributes.assigned);
    
    if (!availableAllocation) {
      throw new Error('Tidak ada alokasi port yang tersedia');
    }
    
    pteroLog('SUCCESS', 'Available allocation found', { 
      nodeId: node.id, 
      allocationId: availableAllocation.attributes.id,
      ip: availableAllocation.attributes.ip,
      port: availableAllocation.attributes.port
    });
    
    return {
      node: node.id,
      allocationId: availableAllocation.attributes.id
    };
  } catch (error) {
    pteroLog('ERROR', 'Failed to get allocation', { error: error.message });
    throw new Error('Gagal mendapatkan alokasi server');
  }
}

// Fungsi untuk membuat server baru
async function createServer(userId, serverName, serverType, serverVersion) {
  pteroLog('INFO', `Creating server: ${serverName} (${serverType})`, { userId });
  
  try {
    const apiClient = await createApiClient();
    
    // Mendapatkan node dan allocation
    const { node, allocationId } = await getAvailableAllocation();
    
    // Konfigurasi server berdasarkan tipe
    const config = await getServerConfig(serverType);

    // Tentukan docker image dari versi yang dipilih (jika ada)
    const dockerImage = resolveDockerImage(serverType, serverVersion, config.docker_image);
    
    // Membuat payload dengan struktur yang benar sesuai Pterodactyl API v1
    const payload = {
      name: serverName,
      user: userId,
      egg: config.egg,
      docker_image: dockerImage,
      startup: config.startup || (serverType === 'python' ? 'python3 app.py' : 'npm start'),
      environment: config.environment || {},
      limits: config.limits,
      feature_limits: config.feature_limits,
      allocation: { default: allocationId },
    };
    
    pteroLog('DEBUG', 'Creating server with payload', {
      name: payload.name,
      user: payload.user,
      egg: payload.egg,
      allocation: payload.allocation,
      hasLimits: !!payload.limits,
      hasEnvironment: !!payload.environment,
      startup: payload.startup
    });
    
    // Membuat server
    const response = await apiClient.post('/servers', payload);
    
    pteroLog('SUCCESS', `Server created successfully: ${serverName}`, { 
      serverId: response.data.attributes.id,
      uuid: response.data.attributes.uuid,
      identifier: response.data.attributes.identifier
    });

    return response.data.attributes;
  } catch (error) {
    const errorDetail = error.response?.data?.errors?.[0]?.detail || 
                       error.response?.data?.message || 
                       error.message;
                        
    pteroLog('ERROR', `Failed to create server: ${serverName}`, { 
      error: errorDetail,
      status: error.response?.status,
      responseData: error.response?.data
    });
    
    throw new Error(errorDetail || `Failed to create server: ${serverName}`);
  }
}

// Fungsi untuk membuat test server
async function createTestServer(type) {
  pteroLog('INFO', `Creating test server: ${type}`);
  
  try {
    // Create test user
    const testEmail = `test-${type}-${Date.now()}@test.local`;
    const testUser = await createUser(
      testEmail,
      `test-${type}-${Date.now()}`,
      'Test',
      'User',
      'testpassword123'
    );

    // Create test server using template
    const testServer = await createServer(
      testUser.id,
      `test-${type}-server-${Date.now()}`,
      type
    );

    pteroLog('SUCCESS', `Test server created: ${type}`, { 
      serverId: testServer.identifier,
      userEmail: testEmail
    });

    return {
      success: true,
      message: `Test server ${type} berhasil dibuat`,
      serverId: testServer.identifier,
      serverData: testServer,
      userData: testUser
    };

  } catch (error) {
    pteroLog('ERROR', `Failed to create test server (${type})`, { error: error.message });
    return {
      success: false,
      message: error.message || 'Gagal membuat test server'
    };
  }
}

// Fungsi untuk mendapatkan detail server
async function getServer(serverId) {
  pteroLog('INFO', `Getting server details: ${serverId}`);
  
  try {
    const apiClient = await createApiClient();
    const response = await apiClient.get(`/servers/${serverId}`);
    
    pteroLog('SUCCESS', `Server details retrieved: ${serverId}`);
    return response.data.attributes;
  } catch (error) {
    const errorDetail = error.response?.data?.message || error.message;
    pteroLog('ERROR', `Failed to get server: ${serverId}`, { error: errorDetail });
    throw new Error(errorDetail || 'Gagal mendapatkan detail server');
  }
}

module.exports = {
  createUser,
  createServer,
  getAvailableAllocation,
  getServer,
  createTestServer,
  getServerConfig,
  getPterodactylConfig,
  resolveDockerImage
};