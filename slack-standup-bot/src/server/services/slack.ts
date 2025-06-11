import { WebClient, type KnownBlock, type View } from "@slack/web-api";
import { env } from "~/env";
import type { SlackChannel, SlackUser } from "~/types/slack";

// Add interface for Slack API Error
interface SlackAPIError extends Error {
  data: {
    error: string;
  };
}

// Type guard for SlackAPIError
function isSlackAPIError(error: unknown): error is SlackAPIError {
  if (!(error instanceof Error)) return false;

  const maybeSlackError = error as Partial<SlackAPIError>;
  return (
    typeof maybeSlackError.data === "object" &&
    maybeSlackError.data !== null &&
    typeof (maybeSlackError.data as { error?: unknown })?.error === "string"
  );
}

class SlackService {
  private static instance: SlackService;
  private client: WebClient;

  private constructor() {
    this.client = new WebClient(env.SLACK_BOT_TOKEN);
  }

  public static getInstance(): SlackService {
    if (!SlackService.instance) {
      SlackService.instance = new SlackService();
    }
    return SlackService.instance;
  }

  // DM Operations
  public async openDM(userId: string) {
    const result = await this.client.conversations.open({ users: userId });
    if (!result.ok || !result.channel?.id) {
      throw new Error("Failed to open DM channel");
    }
    return result.channel.id;
  }

  public async sendDM(userId: string, text: string, blocks?: KnownBlock[]) {
    const channelId = await this.openDM(userId);
    return this.client.chat.postMessage({
      channel: channelId,
      text,
      blocks: blocks ?? [],
    });
  }

  // Channel Operations
  public async listChannels(): Promise<SlackChannel[]> {
    try {
      const result = await this.client.conversations.list({
        types: "public_channel,private_channel",
      });

      if (!result.ok || !result.channels) {
        throw new Error("Failed to fetch channels");
      }

      return result.channels
        .filter((c) => !c.is_archived)
        .slice(0, 100)
        .map((c) => ({
          id: c.id ?? "",
          name: c.name ?? "",
          is_archived: c.is_archived ?? false,
        }));
    } catch (error) {
      console.error("Failed to fetch team channels:", error);
      return [];
    }
  }

  public async postMessage(channel: string, text: string, thread_ts?: string) {
    return this.client.chat.postMessage({
      channel,
      text,
      thread_ts,
    });
  }

  // User Operations
  public async listUsers(): Promise<SlackUser[]> {
    try {
      const result = await this.client.users.list({
        limit: 200, // Add a reasonable limit
      });
      if (!result.ok || !result.members) {
        throw new Error("Failed to fetch users");
      }

      return result.members
        .filter((m) => !m.deleted && !m.is_bot)
        .map((m) => ({
          id: m.id ?? "",
          name: m.name ?? "",
          deleted: m.deleted ?? false,
          is_bot: m.is_bot ?? false,
          tz: m.tz,
        }));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      return [];
    }
  }

  // OAuth Operations
  public async handleOAuth(code: string) {
    return this.client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
    });
  }

  // View Operations
  public async openModal(triggerId: string, view: View) {
    return this.client.views.open({
      trigger_id: triggerId,
      view: view,
    });
  }

  async verifyAndJoinChannel(channelId: string): Promise<boolean> {
    try {
      // First try to post to check if we're in the channel
      try {
        await this.postMessage(channelId, "🔍 Verifying bot access...");
        // If successful, we're already in the channel
        return true;
      } catch (error: unknown) {
        if (isSlackAPIError(error) && error.data.error === "not_in_channel") {
          // Try to join the channel
          try {
            await this.client.conversations.join({ channel: channelId });
            await this.postMessage(
              channelId,
              "👋 Hello! I've joined to post standup summaries here.",
            );
            return true;
          } catch (joinError: unknown) {
            if (
              isSlackAPIError(joinError) &&
              joinError.data.error === "is_private"
            ) {
              console.error("Cannot join private channel:", channelId);
              return false;
            }
            throw joinError;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error("Failed to verify/join channel:", error);
      return false;
    }
  }
}

// Export singleton instance
export const slackService = SlackService.getInstance();
