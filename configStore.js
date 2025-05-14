// configStore.js
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'standupConfigs.json');

// Read config from file
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log('📁 No existing config, starting fresh.');
    return {};
  }
}

// Save config to file
function saveAllConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

let configData = loadConfig();

function getConfig(teamId) {
  return configData[teamId];
}

function saveConfig(teamId, config) {
  configData[teamId] = config;
  saveAllConfig(configData);
}

function getAllConfigs() {
  return configData;
}

module.exports = {
  getConfig,
  saveConfig,
  getAllConfigs,
};
