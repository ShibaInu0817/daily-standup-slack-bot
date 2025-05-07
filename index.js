require('dotenv').config();
const express = require('express');
const { WebClient } = require('@slack/web-api');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { getConfig, saveConfig } = require('./configStore');

const app = express();
const port = 3000;
const client = new WebClient(process.env.SLACK_BOT_TOKEN);
app.use(bodyParser.urlencoded({ extended: true }));


// Parse raw and JSON
app.use(bodyParser.json());

// In-memory storage of user progress
const userState = {};

// Standup questions
const questions = [
  "1. What did you do yesterday?",
  "2. What will you do today?",
  "3. Any blockers?"
];



// Send standup questions to a user
async function startStandup(userId, teamId) {
  const config = getConfig(teamId);
  if (!config) {
    console.log(`⚠️ No standup config found for team ${teamId}`);
    return;
  }

  userState[userId] = { step: 0, answers: [] };

  // Open DM with user
  const im = await client.conversations.open({ users: userId });
  const dmChannel = im.channel.id;

  await client.chat.postMessage({
    channel: dmChannel,
    text: `👋 Hi! It's time for your standup.`,
  });

  await client.chat.postMessage({
    channel: dmChannel,
    text: questions[0],
  });
}


// Listen for message events (Slack Event Subscriptions required)
app.post('/slack/events', async (req, res) => {
  const { type, challenge, event } = req.body;

  // Slack URL verification
  if (type === 'url_verification') {
    return res.send({ challenge });
  }

  if (event && event.type === 'message' && event.channel_type === 'im' && !event.bot_id) {
    const userId = event.user;
    const userText = event.text;

    // If user not in state, ignore
    if (!userState[userId]) {
      return res.sendStatus(200);
    }

    // Save answer
    const state = userState[userId];
    state.answers.push(userText);
    state.step++;

    if (state.step < questions.length) {
      // Ask next question
      await client.chat.postMessage({
        channel: userId,
        text: questions[state.step],
      });
    } else {
      // All answers collected — post to #standup-daily
      const config = getConfig(event.team); // `event.team` gives the team ID from the event payload
      const channelId = config?.channel || process.env.STANDUP_CHANNEL_ID;

      

      const parent = await client.chat.postMessage({
        channel: channelId,
        text: `📝 Daily Standup from <@${userId}>`,
      });

      for (let i = 0; i < questions.length; i++) {
        await client.chat.postMessage({
          channel: channelId,
          thread_ts: parent.ts,
          text: `${questions[i]}\n${state.answers[i]}`,
        });
      }

      await client.chat.postMessage({
        channel: userId,
        text: "✅ Thanks! Your standup was posted.",
      });

      // Clear user state
      delete userState[userId];
    }
  }

  res.sendStatus(200);
});

// Handle /standup-config slash command
app.post('/slack/command', async (req, res) => {
  const { user_id, trigger_id } = req.body;

  // Respond immediately to avoid timeout
  res.send('');

  // Open modal
  await client.views.open({
    trigger_id,
    view: {
      type: 'modal',
      callback_id: 'standup_config_modal',
      title: {
        type: 'plain_text',
        text: 'Configure Standup',
      },
      submit: {
        type: 'plain_text',
        text: 'Save',
      },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'time_block',
          element: {
            type: 'plain_text_input',
            action_id: 'standup_time',
            placeholder: {
              type: 'plain_text',
              text: 'e.g., 09:00 AM',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Daily Standup Time',
          },
        },
        {
          type: 'input',
          block_id: 'channel_block',
          element: {
            type: 'plain_text_input',
            action_id: 'standup_channel',
            placeholder: {
              type: 'plain_text',
              text: '#standup-daily',
            },
          },
          label: {
            type: 'plain_text',
            text: 'Standup Channel',
          },
        },
      ],
    },
  });
});



// Test route to start standup manually
// Manual test: http://localhost:3000/start/U12345/T12345
app.get('/start/:userId/:teamId', async (req, res) => {
  const { userId, teamId } = req.params;
  await startStandup(userId, teamId);
  res.send("Standup started!");
});




// Handle interactive submission of the config modal
app.post('/slack/interact', express.urlencoded({ extended: true }), async (req, res) => {
  const payload = JSON.parse(req.body.payload);

  if (payload.type === 'view_submission' && payload.view.callback_id === 'standup_config_modal') {
    const values = payload.view.state.values;
    const standupTime = values.time_block.standup_time.value;
    const standupChannel = values.channel_block.standup_channel.value;
    const teamId = payload.team.id;

    // Save config in-memory
    saveConfig(teamId, {
      time: standupTime,
      channel: standupChannel,
    });

    console.log(`🔧 Saved config for team ${teamId}:`, getConfig(teamId));

    return res.send({ response_action: 'clear' });
  }

  res.sendStatus(200);
});



app.listen(port, () => {
  console.log(`🚀 Slack bot listening on http://localhost:${port}`);
});

console.log('Server is running...')

