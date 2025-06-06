import { z } from "zod";

// Slack Configuration Types
export const StandupConfigSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(
    z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
  ),
  channel: z.string(),
  timezone: z.string().default("UTC"),
  enableReminders: z.boolean().default(true),
  enableTimeouts: z.boolean().default(true),
  timeoutDuration: z.number().min(30).max(240).default(120),
});

export type StandupConfig = z.infer<typeof StandupConfigSchema>;

// Slack User State Types
export interface UserState {
  step: number;
  answers: string[];
  teamId: string;
  startTime: number;
  lastActivityTime: number;
}

// Slack API Response Types
export interface SlackAPIResponse {
  ok: boolean;
  error?: string;
}

// Slack Event Types
export interface SlackEvent {
  type: string;
  user: string;
  channel: string;
  team: string;
  text?: string;
  ts: string;
  bot_id?: string;
  thread_ts?: string;
  channel_type?: "im" | "channel" | "group" | "mpim";
}

export interface SlackEventCallback {
  type: "event_callback";
  event: SlackEvent;
  team_id: string;
  api_app_id: string;
  event_id: string;
  event_time: number;
}

export interface SlackUrlVerification {
  type: "url_verification";
  challenge: string;
}

export type SlackEventPayload = SlackEventCallback | SlackUrlVerification;

// Slack Command Types
export interface SlackCommand {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

// Slack Interactive Component Types
export interface SlackInteraction {
  type: string;
  user: {
    id: string;
    username: string;
    team_id: string;
  };
  team: {
    id: string;
    domain: string;
  };
  channel: {
    id: string;
    name: string;
  };
  callback_id: string;
  action_ts: string;
  token: string;
  trigger_id: string;
  view?: {
    callback_id: string;
    state: {
      values: Record<
        string,
        Record<
          string,
          {
            type: string;
            value?: string;
            selected_option?: {
              text: { type: string; text: string };
              value: string;
            };
            selected_options?: Array<{
              text?: { type: string; text: string };
              value: string;
            }>;
          }
        >
      >;
    };
  };
}

// Slack Channel Types
export interface SlackChannel {
  id: string;
  name: string;
  is_archived: boolean;
}

// Slack User Types
export interface SlackUser {
  id: string;
  name: string;
  deleted: boolean;
  is_bot: boolean;
  tz?: string;
}

// Slack Team Types
export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
}

// OAuth Types
export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  team: SlackTeam;
  error?: string;
}

// Configuration Store Types
export interface ConfigStore {
  [teamId: string]: StandupConfig;
}

// User State Store Types
export interface UserStateStore {
  [userId: string]: UserState;
}

// Team Store Types
export interface TeamStore {
  [teamId: string]: {
    [timezone: string]: string[]; // Array of user IDs
  };
}
