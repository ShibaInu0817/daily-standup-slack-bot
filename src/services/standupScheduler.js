// standupScheduler.js
const schedule = require('node-schedule');
const { getAllConfigs } = require('../configStore');
const { getUsersGroupedByTimezone } = require('./teamStore');
const { startStandup, questions } = require('./standupLogic');
const { client } = require('./slackClient');

// Keep track of scheduled jobs
const scheduledJobs = [];

/**
 * Send a reminder to a user about upcoming standup
 * @param {string} userId - The Slack user ID
 * @param {string} teamId - The Slack team ID
 * @param {string} scheduledTime - The scheduled standup time
 */
async function sendStandupReminder(userId, teamId, scheduledTime) {
  try {
    const im = await client.conversations.open({ users: userId });
    const dmChannel = im.channel.id;
    
    // Create reminder message with question preview
    const questionPreview = questions.map(q => `• ${q}`).join('\n');
    const reminderText = `👋 *Reminder:* You have a standup scheduled in 30 minutes (${scheduledTime}).\n\nYou'll be asked to answer:\n${questionPreview}`;
    
    await client.chat.postMessage({
      channel: dmChannel,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: reminderText
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "React with 👍 to acknowledge this reminder"
            }
          ]
        }
      ],
      text: `Reminder: Standup in 30 minutes`
    });
    
    console.log(`🔔 Sent standup reminder to user ${userId} in team ${teamId}`);
  } catch (error) {
    console.error(`❌ Failed to send reminder to user ${userId}:`, error);
  }
}

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

        // Schedule the standup
        const standupJob = schedule.scheduleJob(
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
        scheduledJobs.push(standupJob);
        console.log(`✅ Scheduled standup for ${day} at ${config.time} in timezone ${timezone} for ${userIds.length} users in team ${teamId}`);
        
        // Schedule the reminder 30 minutes before if enabled
        if (config.enableReminders) {
          // Calculate reminder time (30 minutes before standup)
          let reminderHour = configHour;
          let reminderMinute = configMinute - 30;
          
          // Handle minute underflow
          if (reminderMinute < 0) {
            reminderMinute += 60;
            reminderHour -= 1;
            
            // Handle hour underflow
            if (reminderHour < 0) {
              reminderHour += 24;
              // This would be the previous day, but for simplicity we'll keep it same day
              // A more complete solution would handle day change if needed
            }
          }
          
          const reminderJob = schedule.scheduleJob(
            {
              dayOfWeek: dayIndex,
              hour: reminderHour,
              minute: reminderMinute,
              tz: timezone
            },
            async () => {
              try {
                console.log(`🔔 Sending reminders for ${userIds.length} users in timezone ${timezone} for standup at ${config.time}`);
                
                for (const userId of userIds) {
                  await sendStandupReminder(userId, teamId, config.time);
                }
              } catch (e) {
                console.error(`❌ Failed to send reminders for timezone ${timezone}:`, e);
              }
            }
          );
          
          scheduledJobs.push(reminderJob);
          console.log(`✅ Scheduled reminders for ${day} at ${reminderHour}:${reminderMinute.toString().padStart(2, '0')} in timezone ${timezone}`);
        }
      });
    });
  });
}

module.exports = {
  scheduleStandups,
  sendStandupReminder
}; 