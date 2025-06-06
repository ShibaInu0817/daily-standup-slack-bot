import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { type UserState } from "~/types/slack";
import { slackService } from "~/server/services/slack";
import { configService } from "~/server/services/config";

// In-memory state store
const userState: Record<string, UserState> = {};

// Standup questions
const questions = [
  "1. What did you do yesterday?",
  "2. What will you do today?",
  "3. Any blockers?",
];

export const standupRouter = createTRPCRouter({
  // Start a standup session for a user
  start: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, teamId } = input;
      const config = configService.getConfig(teamId);

      if (!config) {
        throw new Error(`No standup config found for team ${teamId}`);
      }

      // Initialize user state
      userState[userId] = {
        step: 0,
        answers: [],
        teamId,
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      };

      console.log("Started standup session:", {
        userId,
        teamId,
        state: userState[userId],
      });

      // Send initial messages
      await slackService.sendDM(userId, "👋 Hi! It's time for your standup.");
      await slackService.sendDM(userId, questions[0]!);

      return { success: true };
    }),

  // Process a user's standup response
  processResponse: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
        text: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, teamId, text } = input;
      const state = userState[userId];

      console.log("Processing response:", {
        userId,
        teamId,
        text,
        currentState: state,
      });

      if (!state) {
        console.log("No active session found for user:", userId);
        return { success: false, error: "No active standup session" };
      }

      // Update last activity time
      state.lastActivityTime = Date.now();
      state.answers.push(text);
      state.step++;

      console.log("Updated state:", {
        userId,
        step: state.step,
        answers: state.answers,
      });

      if (state.step < questions.length) {
        // Send next question
        await slackService.sendDM(userId, questions[state.step]!);
        return { success: true, completed: false };
      } else {
        // Post standup summary
        const config = configService.getConfig(teamId);
        if (!config) {
          throw new Error(`No standup config found for team ${teamId}`);
        }

        console.log("Posting standup summary:", {
          userId,
          channel: config.channel,
          answers: state.answers,
        });

        const parent = await slackService.postMessage(
          config.channel,
          `📝 Daily Standup from <@${userId}>`,
        );

        if (parent.ts) {
          // Post answers in thread
          for (let i = 0; i < questions.length; i++) {
            await slackService.postMessage(
              config.channel,
              `${questions[i]!}\n${state.answers[i]!}`,
              parent.ts,
            );
          }
        }

        // Send completion message
        await slackService.sendDM(
          userId,
          "✅ Thanks! Your standup was posted.",
        );

        // Clear user state
        delete userState[userId];

        return { success: true, completed: true };
      }
    }),

  // Check if a user is in an active standup
  checkActive: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(({ input }) => {
      return {
        active: !!userState[input.userId],
      };
    }),

  // Update user activity timestamp
  updateActivity: publicProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const state = userState[input.userId];
      if (state) {
        state.lastActivityTime = Date.now();
      }
      return { success: true };
    }),

  // Check for timed out sessions
  checkTimeouts: publicProcedure.mutation(async () => {
    const now = Date.now();
    const timeoutPromises = [];

    for (const [userId, state] of Object.entries(userState)) {
      const config = configService.getConfig(state.teamId);
      if (!config?.enableTimeouts) continue;

      const timeoutDuration = (config.timeoutDuration || 120) * 60 * 1000; // Convert to ms
      const timeSinceActivity = now - state.lastActivityTime;

      if (timeSinceActivity > timeoutDuration) {
        timeoutPromises.push(handleTimeout(userId, state.teamId));
      }
    }

    await Promise.all(timeoutPromises);
    return { success: true };
  }),
});

// Helper function to handle timeouts
async function handleTimeout(userId: string, teamId: string) {
  try {
    await slackService.sendDM(
      userId,
      "⏰ Your standup session has timed out due to inactivity. You can start a new standup when you're ready.",
    );

    console.log(
      `⏰ Standup session timed out for user ${userId} in team ${teamId}`,
    );
    delete userState[userId];
  } catch (error) {
    console.error(`❌ Failed to handle timeout for user ${userId}:`, error);
  }
}
