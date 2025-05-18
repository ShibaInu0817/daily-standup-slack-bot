// standupLogic.js
const { client } = require('./slackClient');
const { getConfig } = require('../configStore');

// User state to track users in the standup process
const userState = {};

// Timeout check interval (in milliseconds)
const TIMEOUT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Standup questions
const questions = [
  "1. What did you do yesterday?",
  "2. What will you do today?",
  "3. Any blockers?"
];

// NOTE: Interval setup moved to app.js for better initialization

/**
 * Checks for timed out standup sessions and cleans them up
 */
async function checkTimeouts() {
  const now = Date.now();
  const timeoutPromises = [];

  // Check each user in standup
  Object.entries(userState).forEach(([userId, state]) => {
    if (!state.teamId) return; // Skip if no team ID
    
    const config = getConfig(state.teamId);
    if (!config || !config.enableTimeouts) return; // Skip if timeouts not enabled
    
    const timeoutDuration = (config.timeoutDuration || 120) * 60 * 1000; // Convert to ms
    const timeSinceActivity = now - state.lastActivityTime;
    
    if (timeSinceActivity > timeoutDuration) {
      timeoutPromises.push(handleTimeout(userId, state.teamId));
    }
  });
  
  await Promise.all(timeoutPromises);
}

/**
 * Handles a timed out standup session
 * @param {string} userId - The Slack user ID
 * @param {string} teamId - The Slack team ID
 */
async function handleTimeout(userId, teamId) {
  try {
    const im = await client.conversations.open({ users: userId });
    const dmChannel = im.channel.id;
    
    await client.chat.postMessage({
      channel: dmChannel,
      text: "⏰ Your standup session has timed out due to inactivity. You can start a new standup when you're ready."
    });
    
    console.log(`⏰ Standup session timed out for user ${userId} in team ${teamId}`);
    delete userState[userId];
  } catch (error) {
    console.error(`❌ Failed to handle timeout for user ${userId}:`, error);
  }
}

/**
 * Starts the standup process for a user
 * @param {string} userId - The Slack user ID
 * @param {string} teamId - The Slack team ID
 */
async function startStandup(userId, teamId) {
  const config = getConfig(teamId);
  if (!config) return console.log(`⚠️ No standup config found for team ${teamId}`);

  // Initialize user state with timestamps
  userState[userId] = { 
    step: 0, 
    answers: [],
    teamId, // Store teamId for timeout checks
    startTime: Date.now(),
    lastActivityTime: Date.now()
  };

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
  
  // Update last activity time
  state.lastActivityTime = Date.now();
  
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

/**
 * Updates user activity timestamp without processing a response
 * @param {string} userId - The Slack user ID
 */
function updateUserActivity(userId) {
  if (userState[userId]) {
    userState[userId].lastActivityTime = Date.now();
  }
}

module.exports = {
  startStandup,
  processStandupResponse,
  isUserInStandup,
  updateUserActivity,
  questions,
  // Export for testing
  checkTimeouts
}; 