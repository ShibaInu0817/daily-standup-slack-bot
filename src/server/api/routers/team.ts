import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { slackService } from "~/server/services/slack";

export const teamRouter = createTRPCRouter({
  // Get channels for a team
  getChannels: publicProcedure.query(async () => {
    const channels = await slackService.listChannels();
    return channels.map((channel) => ({
      text: { type: "plain_text", text: channel.name },
      value: channel.id,
    }));
  }),

  // Get users grouped by timezone
  getUsersByTimezone: publicProcedure
    .input(
      z.object({
        teamId: z.string(),
      }),
    )
    .query(async () => {
      const users = await slackService.listUsers();
      const usersByTimezone: Record<string, string[]> = {};

      for (const user of users) {
        const timezone = user.tz ?? "UTC";
        usersByTimezone[timezone] ??= [];
        usersByTimezone[timezone].push(user.id);
      }

      return usersByTimezone;
    }),

  // Handle OAuth callback
  handleOAuth: publicProcedure
    .input(
      z.object({
        code: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await slackService.handleOAuth(input.code);
        if (!result.ok) {
          throw new Error(result.error ?? "OAuth failed");
        }

        console.log("New team added:", result.team?.name);
        return { success: true, teamName: result.team?.name };
      } catch (error) {
        console.error("OAuth error:", error);
        throw new Error("Failed to add Slack standup bot to your workspace");
      }
    }),
});
