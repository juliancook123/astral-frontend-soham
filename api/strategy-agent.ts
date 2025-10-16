import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runStrategyAgentRequest } from "../server/strategyAgent";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    return;
  }

  const body = typeof req.body === "string" ? safeParseJSON(req.body) : req.body;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const { status, body } = await runStrategyAgentRequest(message, apiKey);
    res.status(status).json(body);
  } catch (error) {
    console.error("[strategy-agent] run failed", error);
    res.status(500).json({
      error: "Failed to run strategy agent.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function safeParseJSON(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
