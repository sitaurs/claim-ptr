const fs = require('fs-extra');
const path = require('path');
const { getConfig, updateConfigFromForm, updateServerTemplate } = require('../services/config');

const CONFIG = path.join(__dirname, '../data/config.json');

describe('config service', () => {
  beforeEach(() => {
    fs.outputJsonSync(CONFIG, {
      server: { port: 3000, admin_session_secret: 'x' },
      whatsapp: { group_id: '1203' },
      server_templates: { nodejs: { egg: 16, docker_image: 'nodeimg', limits: { memory: 512, disk: 1024, cpu: 100, io: 500 }, feature_limits: { databases:1, allocations:1, backups:1 }, environment: {} } }
    });
  });

  test('updateConfigFromForm sets nested keys', async () => {
    await updateConfigFromForm({ 'server.base_url': 'http://local', 'whatsapp.group_id': '9999' });
    const cfg = await getConfig();
    expect(cfg.server.base_url).toBe('http://local');
    expect(cfg.whatsapp.group_id).toBe('9999');
  });

  test('updateServerTemplate updates template', async () => {
    await updateServerTemplate('nodejs', { egg: 16, docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18' });
    const cfg = await getConfig();
    expect(cfg.server_templates.nodejs.docker_image).toMatch(/nodejs_18/);
  });
});
