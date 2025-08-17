const fs = require('fs-extra');
const path = require('path');
const { getGroupConfig, setGroupConfig } = require('../services/welcome-config');

const DB_PATH = path.join(__dirname, '../data/welcome.json');

beforeAll(() => {
  // Backup existing file if any
  if (fs.existsSync(DB_PATH)) {
    fs.copySync(DB_PATH, DB_PATH + '.bak');
  }
  fs.outputJsonSync(DB_PATH, {});
});

afterAll(() => {
  // Restore backup
  if (fs.existsSync(DB_PATH + '.bak')) {
    fs.moveSync(DB_PATH + '.bak', DB_PATH, { overwrite: true });
  } else {
    fs.removeSync(DB_PATH);
  }
});

describe('welcome-config service', () => {
  const groupId = '120363400276669417@g.us';

  test('default config off', () => {
    const cfg = getGroupConfig(groupId);
    expect(cfg.on).toBe(false);
  });

  test('set and get config', () => {
    setGroupConfig(groupId, { on: true, welcome: 'Halo @user' });
    const cfg = getGroupConfig(groupId);
    expect(cfg.on).toBe(true);
    expect(cfg.welcome).toBe('Halo @user');
  });
});
