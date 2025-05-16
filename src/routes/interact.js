// interact.js
const express = require('express');
const router = express.Router();
const { saveConfig } = require('../configStore');
const { scheduleStandups } = require('../services/standupScheduler');

// Handle Slack interactive components
router.post('/', express.urlencoded({ extended: true }), async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  
  if (payload.type === 'view_submission' && payload.view.callback_id === 'standup_config_modal') {
    try {
      const values = payload.view.state.values;
      
      // Extract hour and minute from the new time selectors
      const hour = values.time_selectors?.standup_hour?.selected_option?.value || '09';
      const minute = values.time_selectors?.standup_minute?.selected_option?.value || '00';
      
      // Create the time string in HH:MM format
      const time = `${hour}:${minute}`;
      
      const days = values.days_block.standup_days.selected_options.map(opt => opt.value);
      const channel = values.channel_block.standup_channel.selected_option.value;
      const teamId = payload.team.id;

      // Use UTC as default timezone if needed by your scheduler
      saveConfig(teamId, { time, days, channel, timezone: 'UTC' });
      console.log(`🔧 Saved config for team ${teamId}: ${days.join(', ')} at ${time}`);
      scheduleStandups();
      return res.send({ response_action: 'clear' });
    } catch (error) {
      console.error('Error processing view submission:', error);
      return res.send({
        response_action: 'errors',
        errors: {
          time_selectors: 'Please select both hour and minute'
        }
      });
    }
  }
  
  // Log other interaction types for debugging
  if (payload.type === 'block_actions') {
    console.log('Block action received:', payload.actions[0].action_id);
  }
  
  res.sendStatus(200);
});

module.exports = router; 