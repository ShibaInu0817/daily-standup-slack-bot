require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

// Routes
const commandsRouter = require('./routes/commands');
const eventsRouter = require('./routes/events');
const interactRouter = require('./routes/interact');
const authRouter = require('./routes/auth');

// Services
const { scheduleStandups } = require('./services/standupScheduler');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Slack Standup Bot is running');
});

// Routes
app.use('/slack/command', commandsRouter);
app.use('/slack/events', eventsRouter);
app.use('/slack/interact', interactRouter);
app.use('/slack/auth', authRouter);

// Start server
app.listen(port, () => {
  console.log(`🚀 Slack bot listening on http://localhost:${port}`);
  scheduleStandups();
});

// Self-ping to keep the service alive on hosting platforms that sleep after inactivity
setInterval(() => {
  fetch(`${process.env.DOMAIN_URL}`).then(() =>
    console.log('🔁 Self-ping sent')
  ).catch(console.error);
}, 5 * 60 * 1000); // Every 5 minutes 
