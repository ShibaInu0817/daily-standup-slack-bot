// slackClient.js
const { WebClient } = require('@slack/web-api');

// Create and export Slack client for use across modules
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = { client }; 