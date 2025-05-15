// events.js
const express = require('express');
const router = express.Router();
const { processStandupResponse, isUserInStandup } = require('../services/standupLogic');

// Handle Slack events
router.post('/', async (req, res) => {
  const { type, challenge, event } = req.body;
  
  // Handle URL verification
  if (type === 'url_verification') {
    return res.send({ challenge });
  }

  // Handle message events
  if (event && event.type === 'message' && event.channel_type === 'im' && !event.bot_id) {
    const userId = event.user;
    const userText = event.text;
    const teamId = event.team;
    
    // Process standup responses if user is in standup
    if (isUserInStandup(userId)) {
      await processStandupResponse(userId, teamId, userText);
    }
  }
  
  res.sendStatus(200);
});

module.exports = router; 