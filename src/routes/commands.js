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
    
    // Generate hour options (00-23)
    const hourOptions = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return {
        text: { type: 'plain_text', text: hour },
        value: hour
      };
    });
    
    // Generate minute options (00, 15, 30, 45)
    const minuteOptions = ['00', '15', '30', '45'].map(min => ({
      text: { type: 'plain_text', text: min },
      value: min
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
            type: 'section',
            block_id: 'time_block',
            text: {
              type: 'mrkdwn',
              text: '*Standup Start Time*'
            },
            fields: [
              {
                type: 'mrkdwn',
                text: 'Hour'
              },
              {
                type: 'mrkdwn',
                text: 'Minute'
              }
            ]
          },
          {
            type: 'actions',
            block_id: 'time_selectors',
            elements: [
              {
                type: 'static_select',
                action_id: 'standup_hour',
                placeholder: {
                  type: 'plain_text',
                  text: 'Hour (24h)'
                },
                options: hourOptions
              },
              {
                type: 'static_select',
                action_id: 'standup_minute',
                placeholder: {
                  type: 'plain_text',
                  text: 'Minute'
                },
                options: minuteOptions
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Time is in 24-hour format. Example: 09:00 for 9 AM, 14:30 for 2:30 PM'
              }
            ]
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
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Note: User timezones are automatically detected from Slack profiles. Standups will be sent based on each user\'s local time.'
              }
            ]
          }
        ],
      },
    });
  } catch (err) {
    console.error('Failed to open modal:', err);
  }
});

module.exports = router; 