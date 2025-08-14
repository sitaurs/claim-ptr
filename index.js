const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const { router: apiRouter } = require('./routes/api');
const webRouter = require('./routes/web');
const { setupAdminSession } = require('./middleware/auth');
const { getConfigSection } = require('./services/config');

console.log('🚀 Starting MOOTERACT HUB Backend Server...');
console.log('⏰ Start time:', new Date().toISOString());

// Function untuk logging dengan timestamp
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🐛'
  };
  
  const logMessage = `${prefix[level] || 'ℹ️'} [${timestamp}] ${message}`;
  console.log(logMessage);
  
  if (data) {
    console.log('📊 Data:', JSON.stringify(data, null, 2));
  }
}

log('INFO', 'Initializing backend server...');

// Memastikan file data ada
log('INFO', 'Checking data directory and files...');
if (!fs.existsSync('./data')) {
  log('WARNING', 'Data directory not found, creating...');
  fs.mkdirSync('./data');
  log('SUCCESS', 'Data directory created');
}

if (!fs.existsSync('./data/users.json')) {
  log('WARNING', 'users.json not found, creating...');
  fs.writeJsonSync('./data/users.json', []);
  log('SUCCESS', 'users.json created');
}

if (!fs.existsSync('./data/servers.json')) {
  log('WARNING', 'servers.json not found, creating...');
  fs.writeJsonSync('./data/servers.json', []);
  log('SUCCESS', 'servers.json created');
}

if (!fs.existsSync('./data/otps.json')) {
  log('WARNING', 'otps.json not found, creating...');
  fs.writeJsonSync('./data/otps.json', []);
  log('SUCCESS', 'otps.json created');
}

if (!fs.existsSync('./data/promotions.json')) {
  log('WARNING', 'promotions.json not found, creating...');
  fs.writeJsonSync('./data/promotions.json', []);
  log('SUCCESS', 'promotions.json created');
}

// Memastikan file konfigurasi ada
if (!fs.existsSync('./data/config.json')) {
  log('ERROR', 'Config file not found! Creating default config...');
  const defaultConfig = {
    server: {
      port: 3000,
      admin_session_secret: 'zamani-zamani-fahri-zamani'
    },
    pterodactyl: {
      panel_url: 'https://panel.example.com',
      api_key: 'your-api-key'
    },
    whatsapp: {
      group_id: '',
      auto_start: false,
      admin_commands: []
    },
    server_templates: {
      nodejs: {
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
  fs.writeJsonSync('./data/config.json', defaultConfig, { spaces: 2 });
  log('SUCCESS', 'Default config file created');
} else {
  log('SUCCESS', 'Config file found');
}

log('INFO', 'Initializing Express application...');
// Inisialisasi Express
const app = express();
let serverConfig;

// Mendapatkan konfigurasi server
try {
  log('INFO', 'Loading server configuration...');
  serverConfig = fs.readJsonSync('./data/config.json').server;
  log('SUCCESS', 'Server config loaded', serverConfig);
} catch (error) {
  log('ERROR', 'Error loading server config, using defaults', error.message);
  serverConfig = { port: 3000 };
}

const PORT = serverConfig.port || 3000;
log('INFO', `Server will start on port: ${PORT}`);

log('INFO', 'Setting up middleware...');
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Setup admin session
app.use(setupAdminSession);
log('SUCCESS', 'Admin session middleware configured');

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
log('SUCCESS', 'EJS view engine configured');

log('INFO', 'Setting up routes...');
// Routes
app.use('/api', apiRouter);
app.use('/', webRouter);
log('SUCCESS', 'Routes configured');

// Error handling middleware
app.use((error, req, res, next) => {
  log('ERROR', 'Unhandled application error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    headers: req.headers
  });
  
  const isHtmlRequest = req.headers.accept && req.headers.accept.includes('text/html');
  const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Server error';
  
  if (isHtmlRequest) {
    // Render error page untuk HTML requests
    const errorTemplate = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error 500 - MOOTERACT HUB</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center">
        <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <div class="text-red-500 text-6xl mb-4">❌</div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Error 500</h1>
            <p class="text-gray-600 mb-4">Terjadi kesalahan internal server</p>
            <p class="text-sm text-gray-500 mb-6">${errorMessage}</p>
            <div class="space-y-2">
                <a href="/" class="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition">
                    Kembali ke Home
                </a>
                <a href="/admin" class="block w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition">
                    Admin Panel
                </a>
            </div>
        </div>
    </body>
    </html>`;
    
    res.status(500).send(errorTemplate);
  } else {
    // JSON response untuk API requests
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Start server
log('INFO', 'Starting HTTP server...');
app.listen(PORT, () => {
  log('SUCCESS', `🌐 Backend server running at http://localhost:${PORT}`);
  log('INFO', '📝 Admin Panel: http://localhost:' + PORT + '/admin');
  log('INFO', '🔑 Default Login: admin / admin123');
  log('INFO', '🤖 To start WhatsApp Bot: npm run dev-bot');
  log('INFO', '🚀 Server started successfully!');
});
