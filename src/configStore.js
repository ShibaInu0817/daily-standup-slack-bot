// configStore.js
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../standupConfigs.json');

// Default configurations
const DEFAULT_CONFIG = {
  enableReminders: true,
  enableTimeouts: true,
  timeoutDuration: 120 // minutes
};

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

/**
 * Saves team configuration with defaults for missing values
 * @param {string} teamId - The Slack team ID
 * @param {Object} config - The configuration object
 */
function saveConfig(teamId, config) {
  // Merge with default configurations for new fields
  configData[teamId] = {
    ...DEFAULT_CONFIG,
    ...configData[teamId], // Include any existing config
    ...config // Override with new config
  };
  saveAllConfig(configData);
}

function getAllConfigs() {
  return configData;
}

module.exports = {
  getConfig,
  saveConfig,
  getAllConfigs,
  DEFAULT_CONFIG
}; 