// standupLogic.js
const { client } = require('./slackClient');
const { getConfig } = require('../configStore');

// User state to track users in the standup process
const userState = {};

// Standup questions
const questions = [
  "1. What did you do yesterday?",
  "2. What will you do today?",
  "3. Any blockers?"
];

/**
 * Starts the standup process for a user
 * @param {string} userId - The Slack user ID
 * @param {string} teamId - The Slack team ID
 */
async function startStandup(userId, teamId) {
  const config = getConfig(teamId);
  if (!config) return console.log(`⚠️ No standup config found for team ${teamId}`);

  userState[userId] = { step: 0, answers: [] };

  const im = await client.conversations.open({ users: userId });
  const dmChannel = im.channel.id;

  await client.chat.postMessage({ channel: dmChannel, text: `👋 Hi! It's time for your standup.` });
  await client.chat.postMessage({ channel: dmChannel, text: questions[0] });
}

/**
 * Processes a user's standup response
 * @param {string} userId - The Slack user ID
 * @param {string} teamId - The Slack team ID
 * @param {string} text - The user's message text
 */
async function processStandupResponse(userId, teamId, text) {
  if (!userState[userId]) return false;

  const state = userState[userId];
  state.answers.push(text);
  state.step++;

  if (state.step < questions.length) {
    await client.chat.postMessage({ channel: userId, text: questions[state.step] });
    return true;
  } else {
    const config = getConfig(teamId);
    const channelId = config?.channel;
    const parent = await client.chat.postMessage({ channel: channelId, text: `📝 Daily Standup from <@${userId}>` });

    for (let i = 0; i < questions.length; i++) {
      await client.chat.postMessage({ channel: channelId, thread_ts: parent.ts, text: `${questions[i]}\n${state.answers[i]}` });
    }

    await client.chat.postMessage({ channel: userId, text: "✅ Thanks! Your standup was posted." });
    delete userState[userId];
    return true;
  }
}

/**
 * Checks if a user is in standup state
 * @param {string} userId - The Slack user ID
 * @returns {boolean} - Whether the user is in a standup
 */
function isUserInStandup(userId) {
  return !!userState[userId];
}

module.exports = {
  startStandup,
  processStandupResponse,
  isUserInStandup,
  questions
}; 