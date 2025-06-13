import { type NextRequest } from "next/server";
import { createCaller } from "~/server/api/root";
import { configService } from "~/server/services/config";
import { type SlackInteraction } from "~/types/slack";
import { slackService } from "~/server/services/slack";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const payload = JSON.parse(
      formData.get("payload") as string,
    ) as SlackInteraction;

    // Handle view submissions
    if (
      payload.type === "view_submission" &&
      payload.view?.callback_id === "standup_config_modal"
    ) {
      const values = payload.view.state.values;

      // Extract hour and minute from the time selectors
      const hourSelector = values.time_selectors?.standup_hour;
      const minuteSelector = values.time_selectors?.standup_minute;

      // Use selected_option (singular) instead of selected_options (plural)
      const hour = hourSelector?.selected_option?.value ?? "09";
      const minute = minuteSelector?.selected_option?.value ?? "00";

      // Log the values for debugging
      console.log("Time values:", {
        hour,
        minute,
        rawHourSelector: hourSelector?.selected_option,
        rawMinuteSelector: minuteSelector?.selected_option,
      });

      // Create the time string in HH:MM format
      const time = `${hour}:${minute}`;

      // Extract and validate days
      const selectedDays =
        values.days_block?.standup_days?.selected_options?.map(
          (opt) => opt.value,
        ) ?? [];
      const validDays = selectedDays.filter(
        (
          day,
        ): day is
          | "monday"
          | "tuesday"
          | "wednesday"
          | "thursday"
          | "friday"
          | "saturday"
          | "sunday" => {
          return [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].includes(day);
        },
      );

      // Extract channel
      const channelSelector = values.channel_block?.standup_channel;

      // Log raw channel data for debugging
      console.log("Channel selector data:", {
        rawChannelSelector: channelSelector,
        rawSelectedOption: channelSelector?.selected_option,
      });

      const channel = channelSelector?.selected_option?.value ?? "";

      const teamId = payload.team.id;

      // Verify channel access before saving config
      if (channel) {
        const hasAccess = await slackService.verifyAndJoinChannel(channel);
        if (!hasAccess) {
          return new Response(
            JSON.stringify({
              response_action: "errors",
              errors: {
                channel_block:
                  "Bot needs access to the channel. For public channels, select the channel again. For private channels, please invite the bot using '/invite @YourBotName' in the channel first.",
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Extract feature settings with safe navigation
      const enableReminders =
        !!values.reminder_toggle?.enable_reminders?.selected_options?.length;
      const enableTimeouts =
        !!values.timeout_toggle?.enable_timeouts?.selected_options?.length;
      const timeoutDuration = parseInt(
        values.timeout_duration_block?.timeout_duration?.selected_options?.[0]
          ?.value ?? "120",
        10,
      );

      // Save configuration
      await configService.saveConfig(teamId, {
        time,
        days: validDays,
        channel,
        timezone: "UTC",
        enableReminders,
        enableTimeouts,
        timeoutDuration,
      });

      console.log(
        `🔧 Saved config for team ${teamId}: ${validDays.join(", ")} at ${time}, reminders: ${enableReminders}, timeouts: ${enableTimeouts}, timeout duration: ${timeoutDuration}m`,
      );

      // Reschedule standups
      const caller = createCaller({
        headers: req.headers,
        db: null as any, // We're using in-memory storage, so we don't need the database
      });

      try {
        await caller.scheduler.scheduleAll();
      } catch (error) {
        console.error("Failed to reschedule standups:", error);
      }

      return new Response(JSON.stringify({ response_action: "clear" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Failed to handle interaction:", error);
    return new Response("Failed to process interaction", { status: 500 });
  }
}
