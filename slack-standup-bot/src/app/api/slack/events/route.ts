import { type NextRequest } from "next/server";
import { createCaller } from "~/server/api/root";
import { env } from "~/env";
import crypto from "crypto";
import { type SlackEventPayload } from "~/types/slack";

export async function POST(req: NextRequest) {
  try {
    // Verify request signature
    const timestamp = req.headers.get("x-slack-request-timestamp");
    const signature = req.headers.get("x-slack-signature");

    if (!timestamp || !signature) {
      return new Response("Invalid request", { status: 400 });
    }

    // Verify request is not too old
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      return new Response("Request too old", { status: 400 });
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const baseString = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac("sha256", env.SLACK_SIGNING_SECRET);
    const calculatedSignature = `v0=${hmac.update(baseString).digest("hex")}`;

    if (calculatedSignature !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse body
    const body = JSON.parse(rawBody) as SlackEventPayload;

    // Handle URL verification
    if (body.type === "url_verification") {
      return new Response(body.challenge, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Handle message events
    if (body.type === "event_callback" && body.event.type === "message") {
      const { event } = body;

      // Skip bot messages, threaded replies, and non-DM messages
      if (event.bot_id || event.thread_ts || event.channel_type !== "im") {
        return new Response("", { status: 200 });
      }

      console.log("Processing DM from user:", {
        userId: event.user,
        text: event.text,
        teamId: body.team_id,
      });

      // Create tRPC caller with headers
      const caller = createCaller({
        headers: req.headers,
        db: undefined, // We're not using the database in this implementation
      });

      // Check if user is in standup
      const isActive = await caller.standup.checkActive({
        userId: event.user,
      });

      console.log("User standup status:", {
        userId: event.user,
        isActive: isActive.active,
      });

      if (isActive.active) {
        // Process standup response
        const result = await caller.standup.processResponse({
          userId: event.user,
          teamId: body.team_id,
          text: event.text ?? "",
        });

        console.log("Processed standup response:", {
          userId: event.user,
          success: result.success,
          completed: result.completed,
        });
      }
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Failed to handle event:", error);
    return new Response("Failed to process event", { status: 500 });
  }
}
