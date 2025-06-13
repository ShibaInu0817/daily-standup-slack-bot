import { type NextRequest } from "next/server";
import { createCaller } from "~/server/api/root";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return new Response("Missing code parameter", { status: 400 });
    }

    // Create tRPC caller
    const caller = createCaller({
      headers: req.headers,
      db: undefined as any, // We're not using the database in this implementation
    });

    // Handle OAuth
    const result = await caller.team.handleOAuth({ code });

    if (result.success) {
      return new Response(
        `<html>
          <body>
            <h1>Success! 🎉</h1>
            <p>Slack standup bot was successfully added to ${result.teamName}!</p>
            <p>You can now use the /standup command to configure your standups.</p>
          </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html" },
        },
      );
    } else {
      throw new Error("OAuth failed");
    }
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(
      `<html>
        <body>
          <h1>Error 😢</h1>
          <p>Failed to add Slack standup bot to your workspace.</p>
          <p>Please try again or contact support if the problem persists.</p>
        </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}
