import { NextResponse } from "next/server";
import { z } from "zod";
import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";

// Validation schema for the request body
const requestSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
});

type RequestBody = z.infer<typeof requestSchema>;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { userId, teamId } = requestSchema.parse(body);

    // Create tRPC caller
    const caller = createCaller({ headers: request.headers });

    // Call the standup.start procedure directly
    await caller.standup.start({
      userId,
      teamId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to trigger test standup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
