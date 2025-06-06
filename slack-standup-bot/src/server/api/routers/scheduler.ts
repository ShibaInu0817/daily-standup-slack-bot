import { z } from "zod";
import schedule from "node-schedule";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { configService } from "~/server/services/config";
import { slackService } from "~/server/services/slack";
import { type SlackUser } from "~/types/slack";

// Keep track of scheduled jobs
const scheduledJobs: schedule.Job[] = [];

export const schedulerRouter = createTRPCRouter({
  // Schedule all standups based on configurations
  scheduleAll: publicProcedure.mutation(async () => {
    // Cancel all existing jobs
    scheduledJobs.forEach((job) => job.cancel());
    scheduledJobs.length = 0;

    const allConfigs = configService.getAllConfigs();
    const scheduledStandups = [];

    for (const [teamId, config] of Object.entries(allConfigs)) {
      if (!config.days || !config.time) {
        console.warn(`⚠️ Missing time or days in config for team ${teamId}`);
        continue;
      }

      if (!/^\d{2}:\d{2}$/.test(config.time)) {
        console.warn(
          `⚠️ Invalid time format in config for team ${teamId}: ${config.time}`,
        );
        continue;
      }

      const [hour, minute] = config.time.split(":").map(Number);
      const configHour = hour ?? 9; // Default to 9 AM if parsing fails
      const configMinute = minute ?? 0; // Default to 0 minutes if parsing fails

      // Get all users for the team
      const users = await slackService.listUsers();
      const usersByTimezone = groupUsersByTimezone(users);

      // Schedule for each timezone
      for (const [timezone, users] of Object.entries(usersByTimezone)) {
        for (const day of config.days) {
          const dayIndex = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ].indexOf(day.toLowerCase());

          if (dayIndex === -1) {
            console.warn(
              `⚠️ Invalid day "${day}" in config for team ${teamId}`,
            );
            continue;
          }

          // Schedule the standup
          const standupJob = schedule.scheduleJob(
            {
              dayOfWeek: dayIndex,
              hour: configHour,
              minute: configMinute,
              tz: timezone,
            },
            async () => {
              try {
                console.log(
                  `🚨 Triggering standup for ${users.length} users in timezone ${timezone} on ${day} at ${config.time}`,
                );

                for (const user of users) {
                  await startStandup(user.id, teamId);
                }
              } catch (e) {
                console.error(
                  `❌ Failed to start standup for users in timezone ${timezone}:`,
                  e,
                );
              }
            },
          );

          scheduledJobs.push(standupJob);
          scheduledStandups.push({
            teamId,
            day,
            time: config.time,
            timezone,
            userCount: users.length,
          });

          // Schedule reminders if enabled
          if (config.enableReminders) {
            const reminderJob = scheduleReminder({
              teamId,
              users,
              dayIndex,
              configHour,
              configMinute,
              timezone,
              scheduledTime: config.time,
            });

            if (reminderJob) {
              scheduledJobs.push(reminderJob);
            }
          }
        }
      }
    }

    return { success: true, scheduledStandups };
  }),

  // Get current schedule status
  getStatus: publicProcedure.query(() => {
    return {
      activeJobs: scheduledJobs.length,
      nextInvocations: scheduledJobs.map((job) => job.nextInvocation()),
    };
  }),
});

// Helper function to group users by timezone
function groupUsersByTimezone(users: SlackUser[]) {
  const usersByTimezone: Record<string, SlackUser[]> = {};

  for (const user of users) {
    const timezone = user.tz || "UTC";
    if (!usersByTimezone[timezone]) {
      usersByTimezone[timezone] = [];
    }
    usersByTimezone[timezone].push(user);
  }

  return usersByTimezone;
}

// Helper function to schedule a reminder
function scheduleReminder({
  teamId,
  users,
  dayIndex,
  configHour,
  configMinute,
  timezone,
  scheduledTime,
}: {
  teamId: string;
  users: SlackUser[];
  dayIndex: number;
  configHour: number;
  configMinute: number;
  timezone: string;
  scheduledTime: string;
}) {
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
    }
  }

  return schedule.scheduleJob(
    {
      dayOfWeek: dayIndex,
      hour: reminderHour,
      minute: reminderMinute,
      tz: timezone,
    },
    async () => {
      try {
        console.log(
          `🔔 Sending reminders for ${users.length} users in timezone ${timezone} for standup at ${scheduledTime}`,
        );

        for (const user of users) {
          await sendStandupReminder(user.id, teamId, scheduledTime);
        }
      } catch (e) {
        console.error(
          `❌ Failed to send reminders for timezone ${timezone}:`,
          e,
        );
      }
    },
  );
}

// Helper function to start a standup
async function startStandup(userId: string, teamId: string) {
  try {
    // Get the base URL from the environment or use a default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const result = await fetch(`${baseUrl}/api/trpc/standup.start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          userId,
          teamId,
        },
      }),
    });

    if (!result.ok) {
      throw new Error(`Failed to start standup: ${result.statusText}`);
    }
  } catch (error) {
    console.error(`Failed to start standup for user ${userId}:`, error);
  }
}

// Helper function to send a reminder
async function sendStandupReminder(
  userId: string,
  teamId: string,
  scheduledTime: string,
) {
  const questions = [
    "1. What did you do yesterday?",
    "2. What will you do today?",
    "3. Any blockers?",
  ];

  const questionPreview = questions.map((q) => `• ${q}`).join("\n");
  const reminderText = `👋 *Reminder:* You have a standup scheduled in 30 minutes (${scheduledTime}).\n\nYou'll be asked to answer:\n${questionPreview}`;

  try {
    await slackService.sendDM(userId, reminderText, [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: reminderText,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "React with 👍 to acknowledge this reminder",
          },
        ],
      },
    ]);

    console.log(`🔔 Sent standup reminder to user ${userId} in team ${teamId}`);
  } catch (error) {
    console.error(`❌ Failed to send reminder to user ${userId}:`, error);
  }
}
