import { NextResponse } from "next/server";

/**
 * GET /api/openrouter/usage
 * Fetches OpenRouter API key usage limits and current usage
 */
export async function GET() {
  try {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPEN_ROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch OpenRouter usage:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch usage data",
      },
      { status: 500 }
    );
  }
}
