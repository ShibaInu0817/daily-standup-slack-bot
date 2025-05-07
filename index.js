require('dotenv').config();
const express = require('express');
const { WebClient } = require('@slack/web-api');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = 3000;
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

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
async function startStandup(userId) {
    userState[userId] = { step: 0, answers: [] };
  
    // Open a direct message channel with the user
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
      const channelId = process.env.STANDUP_CHANNEL_ID;
      

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

// Test route to start standup manually
app.get('/start/:userId', async (req, res) => {
  await startStandup(req.params.userId);
  res.send("Standup started!");
});

app.listen(port, () => {
  console.log(`🚀 Slack bot listening on http://localhost:${port}`);
});

console.log('Server is running...')

