export async function POST() {
  try {
    console.log("Healthcheck received");
    return new Response(JSON.stringify({ response_action: "clear" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to handle interaction:", error);
    return new Response("Failed to process interaction", { status: 500 });
  }
}
