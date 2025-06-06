import { type NextRequest } from "next/server";
import { slackService } from "~/server/services/slack";
import { configService } from "~/server/services/config";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const trigger_id = formData.get("trigger_id") as string;

  try {
    // Get channel options
    const channels = await slackService.listChannels();

    // Generate hour options (00-23)
    const hourOptions = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0");
      return {
        text: { type: "plain_text", text: hour },
        value: hour,
      };
    });

    // Generate minute options (00, 15, 30, 45)
    const minuteOptions = ["00", "15", "30", "45"].map((min) => ({
      text: { type: "plain_text", text: min },
      value: min,
    }));

    // Generate timeout duration options (30, 60, 90, 120, 180, 240 minutes)
    const timeoutOptions = [30, 60, 90, 120, 180, 240].map((minutes) => ({
      text: { type: "plain_text", text: `${minutes} minutes` },
      value: minutes.toString(),
    }));

    await slackService.openModal(trigger_id, {
      type: "modal",
      callback_id: "standup_config_modal",
      title: { type: "plain_text", text: "Configure Standup" },
      submit: { type: "plain_text", text: "Save" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "days_block",
          element: {
            type: "checkboxes",
            action_id: "standup_days",
            options: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => ({
              text: { type: "plain_text", text: day },
              value: day.toLowerCase(),
            })),
          },
          label: { type: "plain_text", text: "Select days for standup" },
        },
        {
          type: "section",
          block_id: "time_block",
          text: {
            type: "mrkdwn",
            text: "*Standup Start Time*",
          },
          fields: [
            {
              type: "mrkdwn",
              text: "Hour",
            },
            {
              type: "mrkdwn",
              text: "Minute",
            },
          ],
        },
        {
          type: "actions",
          block_id: "time_selectors",
          elements: [
            {
              type: "static_select",
              action_id: "standup_hour",
              placeholder: {
                type: "plain_text",
                text: "Hour (24h)",
              },
              options: hourOptions,
            },
            {
              type: "static_select",
              action_id: "standup_minute",
              placeholder: {
                type: "plain_text",
                text: "Minute",
              },
              options: minuteOptions,
            },
          ],
        },
        {
          type: "input",
          block_id: "channel_block",
          element: {
            type: "static_select",
            action_id: "standup_channel",
            placeholder: {
              type: "plain_text",
              text: "Select a channel",
            },
            options: channels.map((c) => ({
              text: { type: "plain_text", text: c.name },
              value: c.id,
            })),
          },
          label: {
            type: "plain_text",
            text: "Select channel for standup summaries",
          },
        },
        {
          type: "input",
          block_id: "reminder_toggle",
          optional: true,
          element: {
            type: "checkboxes",
            action_id: "enable_reminders",
            options: [
              {
                text: {
                  type: "plain_text",
                  text: "Send reminders 30 minutes before standup",
                },
                value: "true",
              },
            ],
          },
          label: { type: "plain_text", text: "Reminder Settings" },
        },
        {
          type: "input",
          block_id: "timeout_toggle",
          optional: true,
          element: {
            type: "checkboxes",
            action_id: "enable_timeouts",
            options: [
              {
                text: { type: "plain_text", text: "Enable session timeouts" },
                value: "true",
              },
            ],
          },
          label: { type: "plain_text", text: "Timeout Settings" },
        },
        {
          type: "input",
          block_id: "timeout_duration_block",
          optional: true,
          element: {
            type: "static_select",
            action_id: "timeout_duration",
            placeholder: {
              type: "plain_text",
              text: "Select timeout duration",
            },
            options: timeoutOptions,
          },
          label: { type: "plain_text", text: "Timeout Duration" },
        },
      ],
    });

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Failed to handle command:", error);
    return new Response("Failed to process command", { status: 500 });
  }
}
