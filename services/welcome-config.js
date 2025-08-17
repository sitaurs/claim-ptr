const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/welcome.json');

function ensureFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.outputJsonSync(DB_PATH, {}, { spaces: 2 });
  }
}

function loadDB() {
  ensureFile();
  return fs.readJsonSync(DB_PATH);
}

function saveDB(db) {
  fs.writeJsonSync(DB_PATH, db, { spaces: 2 });
}

function getDefaultCfg() {
  return {
    on: false,
    tagAllOnJoin: false,
    welcome: 'Selamat datang, @user di *{group}*!',
    bye: 'Sampai jumpa, @user dari *{group}*.'
  };
}

function getGroupConfig(groupId) {
  const db = loadDB();
  return db[groupId] ? { ...getDefaultCfg(), ...db[groupId] } : getDefaultCfg();
}

function setGroupConfig(groupId, partial) {
  const db = loadDB();
  const current = db[groupId] ? { ...getDefaultCfg(), ...db[groupId] } : getDefaultCfg();
  db[groupId] = { ...current, ...partial };
  saveDB(db);
}

module.exports = {
  getGroupConfig,
  setGroupConfig,
};

