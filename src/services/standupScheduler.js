// standupScheduler.js
const schedule = require('node-schedule');
const { getAllConfigs } = require('../configStore');
const { getUsersGroupedByTimezone } = require('./teamStore');
const { startStandup } = require('./standupLogic');

// Keep track of scheduled jobs
const scheduledJobs = [];

/**
 * Schedule standups based on saved configurations
 */
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

module.exports = {
  scheduleStandups
}; 