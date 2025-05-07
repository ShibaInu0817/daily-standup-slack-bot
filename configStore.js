// configStore.js

// In-memory storage keyed by team_id
const configByTeam = {};

/**
 * Get config for a Slack team.
 * @param {string} teamId
 * @returns {object|null}
 */
function getConfig(teamId) {
  return configByTeam[teamId] || null;
}

/**
 * Save config for a Slack team.
 * @param {string} teamId
 * @param {object} config
 */
function saveConfig(teamId, config) {
  configByTeam[teamId] = config;
}

module.exports = { getConfig, saveConfig };
