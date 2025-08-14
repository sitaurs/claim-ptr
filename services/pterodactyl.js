const axios = require('axios');
const fs = require('fs-extra');

// Konfigurasi API Pterodactyl
const PANEL_URL = process.env.PANEL_URL || 'https://panel.example.com'; // Ganti dengan URL panel Pterodactyl Anda
const API_KEY = process.env.API_KEY || 'ptla_your_application_api_key'; // Ganti dengan API key Anda

// Konfigurasi default untuk server
const DEFAULT_CONFIG = {
  // Node.js
  nodejs: {
    egg: 15, // ID egg untuk Node.js (sesuaikan dengan panel Anda)
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
  // Python
  python: {
    egg: 16, // ID egg untuk Python (sesuaikan dengan panel Anda)
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
};

// Konfigurasi axios untuk API Pterodactyl
const apiClient = axios.create({
  baseURL: `${PANEL_URL}/api/application`,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'Application/vnd.pterodactyl.v1+json',
    'Content-Type': 'application/json'
  }
});

// Fungsi untuk membuat user baru di Pterodactyl
async function createUser(email, username, firstName, lastName, password) {
  try {
    const response = await apiClient.post('/users', {
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      root_admin: false
    });

    return response.data.attributes;
  } catch (error) {
    console.error('Error membuat user Pterodactyl:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Gagal membuat user');
  }
}

// Fungsi untuk mendapatkan node dan allocation yang tersedia
async function getAvailableAllocation() {
  try {
    // Mendapatkan daftar node
    const nodesResponse = await apiClient.get('/nodes');
    const nodes = nodesResponse.data.data;

    if (nodes.length === 0) {
      throw new Error('Tidak ada node yang tersedia');
    }

    // Pilih node pertama (bisa dimodifikasi untuk load balancing)
    const node = nodes[0].attributes;
    
    // Mendapatkan allocation yang tersedia di node tersebut
    const allocationsResponse = await apiClient.get(`/nodes/${node.id}/allocations`);
    const allocations = allocationsResponse.data.data;
    
    // Cari allocation yang belum digunakan
    const availableAllocation = allocations.find(alloc => !alloc.attributes.assigned);
    
    if (!availableAllocation) {
      throw new Error('Tidak ada alokasi port yang tersedia');
    }
    
    return {
      node: node.id,
      allocation: availableAllocation.attributes.id
    };
  } catch (error) {
    console.error('Error mendapatkan alokasi:', error.response?.data || error.message);
    throw new Error('Gagal mendapatkan alokasi server');
  }
}

// Fungsi untuk membuat server baru
async function createServer(userId, serverName, serverType) {
  try {
    // Validasi tipe server
    if (!DEFAULT_CONFIG[serverType]) {
      throw new Error(`Tipe server '${serverType}' tidak didukung`);
    }
    
    // Mendapatkan node dan allocation
    const { node, allocation } = await getAvailableAllocation();
    
    // Konfigurasi server berdasarkan tipe
    const config = DEFAULT_CONFIG[serverType];
    
    // Membuat server
    const response = await apiClient.post('/servers', {
      name: serverName,
      user: userId,
      egg: config.egg,
      docker_image: config.docker_image,
      startup: config.startup,
      environment: config.environment,
      limits: config.limits,
      feature_limits: config.feature_limits,
      allocation: allocation,
      node: node
    });

    return response.data.attributes;
  } catch (error) {
    console.error('Error membuat server Pterodactyl:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Gagal membuat server');
  }
}

// Fungsi untuk mendapatkan detail server
async function getServer(serverId) {
  try {
    const response = await apiClient.get(`/servers/${serverId}`);
    return response.data.attributes;
  } catch (error) {
    console.error('Error mendapatkan detail server:', error.response?.data || error.message);
    throw new Error('Gagal mendapatkan detail server');
  }
}

// Fungsi untuk membuat test server
async function createTestServer(type) {
  try {
    // Load config template
    const config = await fs.readJson('./data/config.json');
    const template = config.server_templates[type];
    
    if (!template) {
      throw new Error(`Template ${type} tidak ditemukan`);
    }

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

    return {
      success: true,
      message: `Test server ${type} berhasil dibuat`,
      serverId: testServer.identifier,
      serverData: testServer,
      userData: testUser
    };

  } catch (error) {
    console.error('Error creating test server:', error);
    return {
      success: false,
      message: error.message || 'Gagal membuat test server'
    };
  }
}

module.exports = {
  createUser,
  createServer,
  getServer,
  createTestServer,
  PANEL_URL
};