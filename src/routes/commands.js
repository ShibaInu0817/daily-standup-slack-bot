// commands.js
const express = require('express');
const router = express.Router();
const { client } = require('../services/slackClient');
const { getTeamChannels } = require('../services/teamStore');

// Handle Slack slash commands
router.post('/', async (req, res) => {
  const { trigger_id } = req.body;
  res.status(200).send();

  try {
    const options = await getTeamChannels();

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

module.exports = router; 