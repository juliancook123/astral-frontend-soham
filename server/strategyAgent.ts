import { Agent, run, tool } from "@openai/agents"
import { setDefaultOpenAIKey } from "@openai/agents-openai"
import { z } from "zod"

interface StartStreamPayload {
  t: "start_stream"
  v: number
  user_id: string
  session_id: string
  symbol: string
  asset_type: string
  tf: string
  start: string
  batch_partial_ms: number
}

function normalizeSymbol(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return trimmed;
  const alphaNum = trimmed.replace(/[^A-Za-z0-9]/g, "");
  if (alphaNum.length >= 1) return alphaNum.toUpperCase();
  return trimmed.toUpperCase();
}

function buildStartStreamPayload(params: {
  symbol: string
  asset_type?: string | null
  tf?: string | null
  start?: string | null
  batch_partial_ms?: number | null
}): StartStreamPayload {
  const symbol = normalizeSymbol(params.symbol)
  const startInput = params.start && params.start.trim()
  const start = startInput && startInput.length > 0 ? startInput : new Date().toISOString()
  return {
    t: "start_stream",
    v: 1,
    user_id: "tester",
    session_id: "session-local",
    symbol,
    asset_type: params.asset_type ?? "crypto",
    tf: params.tf ?? "1h",
    start,
    batch_partial_ms: params.batch_partial_ms ?? 1000,
  }
}

function createAgent(apiKey: string, streams: Array<{ payload: StartStreamPayload }>): Agent {
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY on the server.")
  }

  setDefaultOpenAIKey(apiKey)

  const getStockData = tool({
    name: "get_stock_data",
    description:
      "Return the payload required to start a websocket data stream for the requested asset.",
    parameters: z.object({
      symbol: z.string().min(1),
      asset_type: z.string().min(1).default("crypto"),
      tf: z.string().min(1).default("1h"),
      start: z.string().nullable().optional(),
      batch_partial_ms: z.number().int().positive().nullable().optional(),
    }),
    execute: async (params) => {
      const payload = buildStartStreamPayload(params)
      streams.push({ payload })
      return {
        message: `Prepared start_stream payload for ${payload.symbol} (${payload.asset_type}, ${payload.tf}).`,
        payload,
      }
    },
  })

  return new Agent({
    name: "Strategy Streamer",
    instructions:
      [
        "You assist with market data streams.",
        "Whenever the user asks for price data, you must call the get_stock_data tool exactly once.",
        "Always provide the uppercase symbol (e.g., BTCUSD), the asset_type (crypto, equity, forex, etc.), and the timeframe field 'tf'.",
        "If the user gives a slash-separated pair like BTC/USD, convert it to BTCUSD.",
        "Default asset_type to 'crypto' and tf to '1h' when they do not specify otherwise.",
        "After calling the tool, confirm to the user that the stream has been started and mention the symbol and timeframe.",
      ].join(" "),
    tools: [getStockData],
    modelSettings: {
      toolChoice: "required",
      parallelToolCalls: false,
    },
    toolUseBehavior: {
      stopAtToolNames: ["get_stock_data"],
    },
  })
}

export async function runStrategyAgentRequest(message: string, apiKey: string) {
  if (!message.trim()) {
    return {
      status: 400,
      body: { error: "message is required" },
    }
  }

  const streams: Array<{ payload: StartStreamPayload }> = []
  const agent = createAgent(apiKey, streams)
  const result = await run(agent, message)

  if (process.env.NODE_ENV !== "production") {
    console.debug("[strategy-agent] run result", {
      finalOutput: result.finalOutput,
      streamsCaptured: streams.length,
      newItems: result.newItems?.map((item: any) => ({
        type: item?.type,
        toolCall: item?.toolCall?.toolCallId ?? item?.toolCallId,
        toolName: item?.toolName,
      })),
    })
  }

  return {
    status: 200,
    body: {
      finalOutput: result.finalOutput ?? null,
      streams,
    },
  }
}
