import { type NextRequest } from "next/server";
import { createCaller } from "~/server/api/root";

// Timeout check interval (5 minutes)
const TIMEOUT_CHECK_INTERVAL = 5 * 60 * 1000;
let lastTimeoutCheck = 0;

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();

    // Check for timeouts if enough time has passed
    if (now - lastTimeoutCheck > TIMEOUT_CHECK_INTERVAL) {
      const caller = createCaller({
        headers: req.headers,
        db: undefined,
      });

      await caller.standup.checkTimeouts();
      lastTimeoutCheck = now;
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return new Response("Error", { status: 500 });
  }
}
