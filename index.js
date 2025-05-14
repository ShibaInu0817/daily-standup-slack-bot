require('dotenv').config();
const express = require('express');
const { WebClient } = require('@slack/web-api');
const bodyParser = require('body-parser');
const schedule = require('node-schedule');
const { getConfig, saveConfig, getAllConfigs } = require('./configStore');

const app = express();
const port = 3000;
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const userState = {};
const questions = [
  "1. What did you do yesterday?",
  "2. What will you do today?",
  "3. Any blockers?"
];

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

async function startStandup(userId, teamId) {
  const config = getConfig(teamId);
  if (!config) return console.log(`⚠️ No standup config found for team ${teamId}`);

  userState[userId] = { step: 0, answers: [] };

  const im = await client.conversations.open({ users: userId });
  const dmChannel = im.channel.id;

  await client.chat.postMessage({ channel: dmChannel, text: `👋 Hi! It's time for your standup.` });
  await client.chat.postMessage({ channel: dmChannel, text: questions[0] });
}

const scheduledJobs = [];

function scheduleStandups() {
  // Cancel all existing jobs
  scheduledJobs.forEach(job => job.cancel());
  scheduledJobs.length = 0;

  const allConfigs = getAllConfigs();
  
  Object.entries(allConfigs).forEach(async ([teamId, config]) => {
    if (!config.days || !config.time) {
      console.warn(`⚠️ Missing time or days in config for team ${teamId}`);
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(config.time)) {
      console.warn(`⚠️ Invalid time format in config for team ${teamId}: ${config.time}`);
      return;
    }

    const [configHour, configMinute] = config.time.split(':').map(Number);
    const usersByTimezone = await getUsersGroupedByTimezone(teamId);
    
    // For each timezone, schedule a job at the equivalent local time
    Object.entries(usersByTimezone).forEach(([timezone, userIds]) => {
      config.days.forEach(day => {
        const dayIndex = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(day.toLowerCase());
        if (dayIndex === -1) {
          console.warn(`⚠️ Invalid day "${day}" in config for team ${teamId}`);
          return;
        }

        const job = schedule.scheduleJob(
          {
            dayOfWeek: dayIndex,
            hour: configHour,
            minute: configMinute,
            tz: timezone
          },
          async () => {
            try {
              console.log(`🚨 Triggering standup for ${userIds.length} users in timezone ${timezone} on ${day} at ${config.time}`);
              
              for (const userId of userIds) {
                await startStandup(userId, teamId);
              }
            } catch (e) {
              console.error(`❌ Failed to start standup for users in timezone ${timezone}:`, e);
            }
          }
        );

        scheduledJobs.push(job);
        console.log(`✅ Scheduled standup for ${day} at ${config.time} in timezone ${timezone} for ${userIds.length} users in team ${teamId}`);
      });
    });
  });
}

app.post('/slack/events', async (req, res) => {
  const { type, challenge, event } = req.body;
  if (type === 'url_verification') return res.send({ challenge });

  if (event && event.type === 'message' && event.channel_type === 'im' && !event.bot_id) {
    const userId = event.user;
    const userText = event.text;
    if (!userState[userId]) return res.sendStatus(200);

    const state = userState[userId];
    state.answers.push(userText);
    state.step++;

    if (state.step < questions.length) {
      await client.chat.postMessage({ channel: userId, text: questions[state.step] });
    } else {
      const config = getConfig(event.team);
      const channelId = config?.channel;
      const parent = await client.chat.postMessage({ channel: channelId, text: `📝 Daily Standup from <@${userId}>` });

      for (let i = 0; i < questions.length; i++) {
        await client.chat.postMessage({ channel: channelId, thread_ts: parent.ts, text: `${questions[i]}\n${state.answers[i]}` });
      }

      await client.chat.postMessage({ channel: userId, text: "✅ Thanks! Your standup was posted." });
      delete userState[userId];
    }
  }
  res.sendStatus(200);
});

app.post('/slack/command', async (req, res) => {
  const { trigger_id } = req.body;
  res.status(200).send();

  try {
    const listChannels = await client.conversations.list({ types: 'public_channel,private_channel' });

    const options = listChannels.channels
      .filter(c => !c.is_archived)
      .slice(0, 100)
      .map(c => ({
        text: { type: 'plain_text', text: c.name },
        value: c.id
      }));

    await client.views.open({
      trigger_id,
      view: {
        type: 'modal',
        callback_id: 'standup_config_modal',
        title: { type: 'plain_text', text: 'Configure Standup' },
        submit: { type: 'plain_text', text: 'Save' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'days_block',
            element: {
              type: 'checkboxes',
              action_id: 'standup_days',
              options: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => ({
                text: { type: 'plain_text', text: day },
                value: day.toLowerCase()
              }))
            },
            label: { type: 'plain_text', text: 'Select days for standup' },
          },
          {
            type: 'input',
            block_id: 'time_block',
            element: {
              type: 'plain_text_input',
              action_id: 'standup_time',
              placeholder: { type: 'plain_text', text: 'e.g., 08:00 (24h format)' },
            },
            label: { type: 'plain_text', text: 'Standup Start Time' },
          },
          {
            type: 'input',
            block_id: 'timezone_block',
            element: {
              type: 'plain_text_input',
              action_id: 'standup_timezone',
              placeholder: { type: 'plain_text', text: 'e.g., America/New_York, Asia/Kuala_Lumpur' },
              initial_value: 'UTC'
            },
            label: { type: 'plain_text', text: 'Default Timezone' },
            hint: { type: 'plain_text', text: 'User-specific timezones will be automatically detected from Slack profiles' }
          },
          {
            type: 'input',
            block_id: 'channel_block',
            element: {
              type: 'static_select',
              action_id: 'standup_channel',
              options,
            },
            label: { type: 'plain_text', text: 'Choose a channel for standup report' },
          },
        ],
      },
    });
  } catch (err) {
    console.error('Failed to open modal:', err);
  }
});

app.post('/slack/interact', express.urlencoded({ extended: true }), async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  
  if (payload.type === 'view_submission' && payload.view.callback_id === 'standup_config_modal') {
    const values = payload.view.state.values;
    const time = values.time_block.standup_time.value;
    const days = values.days_block.standup_days.selected_options.map(opt => opt.value);
    const channel = values.channel_block.standup_channel.selected_option.value;
    const timezone = values.timezone_block.standup_timezone.value;
    const teamId = payload.team.id;

    saveConfig(teamId, { time, days, channel, timezone });
    console.log(`🔧 Saved config for team ${teamId}`);
    scheduleStandups();
    return res.send({ response_action: 'clear' });
  }
  
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`🚀 Slack bot listening on http://localhost:${port}`);
  scheduleStandups();
});
