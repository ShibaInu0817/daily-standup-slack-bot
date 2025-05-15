// interact.js
const express = require('express');
const router = express.Router();
const { saveConfig } = require('../configStore');
const { scheduleStandups } = require('../services/standupScheduler');

// Handle Slack interactive components
router.post('/', express.urlencoded({ extended: true }), async (req, res) => {
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

module.exports = router; 