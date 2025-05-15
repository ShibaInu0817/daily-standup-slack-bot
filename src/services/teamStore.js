// teamStore.js
const { client } = require('./slackClient');

/**
 * Gets users grouped by timezone for a given team
 * @param {string} teamId - The Slack team ID
 * @returns {Object} - Users grouped by timezone
 */
async function getUsersGroupedByTimezone(teamId) {
  try {
    const users = await client.users.list();
    const usersByTimezone = {};
    
    for (const member of users.members) {
      if (!member.is_bot && !member.deleted) {
        const userTimezone = member.tz || 'UTC';
        if (!usersByTimezone[userTimezone]) {
          usersByTimezone[userTimezone] = [];
        }
        usersByTimezone[userTimezone].push(member.id);
      }
    }
    
    return usersByTimezone;
  } catch (error) {
    console.error(`Failed to group users by timezone for team ${teamId}:`, error);
    return {};
  }
}

/**
 * Fetches all channels for a team
 * @returns {Array} - List of channel objects
 */
async function getTeamChannels() {
  try {
    const listChannels = await client.conversations.list({ 
      types: 'public_channel,private_channel' 
    });
    
    return listChannels.channels
      .filter(c => !c.is_archived)
      .slice(0, 100)
      .map(c => ({
        text: { type: 'plain_text', text: c.name },
        value: c.id
      }));
  } catch (error) {
    console.error('Failed to fetch team channels:', error);
    return [];
  }
}

module.exports = {
  getUsersGroupedByTimezone,
  getTeamChannels
}; 