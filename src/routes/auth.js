// auth.js
const express = require('express');
const router = express.Router();
const { client } = require('../services/slackClient');

// OAuth redirect URL
router.get('/oauth/redirect', async (req, res) => {
  const code = req.query.code;
  
  try {
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code
    });
    
    // Here you would typically save the team info and tokens
    // For now, we'll just log and return a simple success message
    console.log('New team added:', result.team.name);
    
    res.send('Slack standup bot was successfully added to your workspace!');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Error adding Slack standup bot to your workspace');
  }
});

module.exports = router; 