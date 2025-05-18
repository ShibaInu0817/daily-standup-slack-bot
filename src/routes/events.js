// events.js
const express = require('express');
const router = express.Router();
const { processStandupResponse, isUserInStandup, updateUserActivity } = require('../services/standupLogic');

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
    
    // Update user activity even if not processing a response
    updateUserActivity(userId);
    
    // Process standup responses if user is in standup
    if (isUserInStandup(userId)) {
      await processStandupResponse(userId, teamId, userText);
    }
  }
  
  // Handle reaction events (for reminder acknowledgements)
  if (event && event.type === 'reaction_added' && event.reaction === 'thumbsup') {
    const userId = event.user;
    
    // Update user activity when they react to a message
    updateUserActivity(userId);
    
    console.log(`👍 User ${userId} acknowledged reminder`);
  }
  
  res.sendStatus(200);
});

module.exports = router; 