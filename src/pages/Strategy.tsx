import React, { useEffect, useState } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import ChartCanvas from "@/components/ChartCanvas"
import CodeDisplay from "@/components/CodeDisplay"

const HF_NER_URL = "https://api-inference.huggingface.co/models/dslim/bert-base-NER"
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || ""
const FMP_KEY = import.meta.env.VITE_FMP_KEY || ""

// --- inlined resolveToTicker helper (now FMP-only search) ---
const LOCAL_MAP: Record<string, string> = {
  nvidia: "NVDA",
  tesla: "TSLA",
  chipotle: "CMG",
  apple: "AAPL",
  microsoft: "MSFT",
  amazon: "AMZN",
  google: "GOOGL",
  alphabet: "GOOGL",
  meta: "META",
  facebook: "META",
  netflix: "NFLX",
}

function looksLikeTicker(input: string) {
  const s = String(input || "").trim().toUpperCase()
  return /^[A-Z.-]{1,5}$/.test(s)
}

/**
 * Resolve an arbitrary input to a ticker symbol.
 * Order:
 *  - direct ticker-like token
 *  - local alias map
 *  - FMP name search (if key present)
 *  - uppercase guess (fallback)
 */
async function resolveToTicker(input: unknown): Promise<string> {
  const raw = String(input || "").trim()
  if (!raw) return ""

  // if user already typed a ticker-like token, use it
  if (looksLikeTicker(raw)) return raw.toUpperCase()

  // local aliases
  const key = raw.toLowerCase()
  if (LOCAL_MAP[key]) return LOCAL_MAP[key]

  // Try FMP Name Search
  if (FMP_KEY) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(raw)}&limit=5&exchange=&apikey=${FMP_KEY}`
      const res = await fetch(url)
      if (res.ok) {
        const data: any = await res.json()
        const best = (data || [])[0]
        const sym = best?.symbol || best?.ticker
        if (sym) return String(sym).toUpperCase()
      } else {
        console.warn("FMP search failed", res.status, await res.text().catch(() => "no-body"))
      }
    } catch (e) {
      console.warn("FMP search error", e)
    }
  }

  // final fallback: return uppercase guess
  return raw.toUpperCase().slice(0, 6)
}
// --- end inlined helper ------------------------------------------------------

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseRelativeDate(text: string): { from?: string; to?: string } | null {
  const m = text.match(/(last|past)?\s*(\d{1,3})\s*(day|days|week|weeks|month|months|year|years)/i)
  if (!m) return null
  const n = parseInt(m[2], 10)
  const unit = m[3].toLowerCase()
  const to = new Date()
  const from = new Date(to)

  if (unit.startsWith("day")) from.setDate(from.getDate() - n)
  else if (unit.startsWith("week")) from.setDate(from.getDate() - n * 7)
  else if (unit.startsWith("month")) from.setMonth(from.getMonth() - n)
  else if (unit.startsWith("year")) from.setFullYear(from.getFullYear() - n)

  return { from: isoDate(from), to: isoDate(to) }
}

function detectChartType(text: string) {
  const s = text.toLowerCase()
  if (s.includes("heiken") || s.includes("heikin")) return "Heikin Ashi"
  if (s.includes("hollow")) return "Hollow Candlestick"
  if (s.includes("candle")) return "Candlestick"
  if (s.includes("line")) return "Line"
  if (s.includes("trend")) return "Trend"
  return "Candlestick"
}

async function callHfNer(text: string) {
  if (!HF_TOKEN) return null
  try {
    const res = await fetch(HF_NER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.warn("HF NER call failed", e)
    return null
  }
}

function extractFromHfOutput(hfOut: any) {
  if (!hfOut) return { companies: [] }
  const companies: string[] = []
  try {
    if (Array.isArray(hfOut)) {
      if (hfOut[0] && hfOut[0].entity_group) {
        hfOut.forEach((t: any) => {
          if (String(t.entity_group).toUpperCase() === "ORG") companies.push(String(t.word).trim())
        })
      } else {
        let cur: string | null = null
        hfOut.forEach((tok: any) => {
          const ent = tok.entity || tok.entity_group || tok.tag
          const w = tok.word || tok.token || tok.value || ""
          if (!w) return
          if (String(ent).toUpperCase().includes("ORG")) {
            if (cur === null) cur = w
            else cur = String(cur) + (String(w).startsWith("##") ? w.replace(/^##/, "") : " " + w)
          } else {
            if (cur !== null) { companies.push(cur); cur = null }
          }
        })
        if (cur !== null) companies.push(cur)
      }
    }
  } catch (e) {
    console.warn("extractFromHfOutput error", e)
  }

  return { companies: Array.from(new Set(companies)).map(s => s.trim()) }
}

/* *********************************************************************
   Chart-term filtering utility
   Prevent chart-type words (Heikin, Candlestick, Hollow, Line, Trend, etc.)
   from being treated as company names / symbols.
   ********************************************************************* */
const CHART_KEYWORDS = [
  "heikin", "heiken", "heikin ashi", "heiken ashi", "heikin-ashi", "heiken-ashi",
  "hollow", "candle", "candlestick", "line", "trend", "ohlc"
]

function isChartTerm(candidate: string) {
  if (!candidate) return false
  const normalized = String(candidate).toLowerCase().replace(/[^a-z\s]/g, " ").trim()
  if (!normalized) return false
  return CHART_KEYWORDS.some(k => normalized.includes(k))
}
/* ********************************************************************* */

/**
 * Fetch historical price series from FMP.
 * Uses: /api/v3/historical-price-full/{symbol}?from=YYYY-MM-DD&to=YYYY-MM-DD&apikey=KEY
 * Returns array of price points (close, open, high, low, date, volume) or [] on failure.
 */
async function fetchFmpHistorical(symbol: string, from?: string, to?: string): Promise<any[]> {
  if (!FMP_KEY) {
    console.warn("FMP key not configured; skipping historical fetch")
    return []
  }

  try {
    const end = to || isoDate(new Date())
    let start = from
    if (!start) {
      const d = new Date()
      d.setMonth(d.getMonth() - 6)
      start = isoDate(d)
    }

    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${start}&to=${end}&apikey=${FMP_KEY}`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn("FMP historical fetch failed", symbol, res.status)
      return []
    }
    const data = await res.json()
    return (data?.historical && Array.isArray(data.historical)) ? data.historical : []
  } catch (e) {
    console.warn("fetchFmpHistorical error", e)
    return []
  }
}

export default function Strategy() {
  const [messages, setMessages] = useState<{ from: "user" | "assistant"; text: string }[]>([])
  const [input, setInput] = useState("")
  const [jsonOut, setJsonOut] = useState<any>(null)
  const userName = "Soham Patel"

  useEffect(() => {
    setMessages([{ from: "assistant", text: `Welcome ${userName} how can I help you today?` }])
  }, [])

  const postMessage = async (text: string) => {
    setMessages(m => [...m, { from: "user", text }])

    if (/^hi$|^hello$|^hey\b|^good (morning|afternoon|evening)/i.test(text)) {
      const txt = `Welcome ${userName} how can I help you today?`
      setMessages(m => [...m, { from: "assistant", text: txt }])
      return
    }

    const chartType = detectChartType(text)
    const hf = await callHfNer(text)
    const { companies } = extractFromHfOutput(hf)

    let fallbacks: string[] = []
    if (!companies.length) {
      const capMatches = Array.from(text.matchAll(/\b([A-Z][a-z]{1,}\b(?:\s+[A-Z][a-z]{1,}\b)*)/g)).map(m => m[1])
      fallbacks = capMatches.filter(w => !/^(Can|Please|I|The|Last|In|For|From|To|Show|Plot)$/i.test(w))
    }

    const rawCandidates = (companies.length ? companies : fallbacks)
    const filteredCandidates = rawCandidates.filter(c => !isChartTerm(c))
    const allCompanies = filteredCandidates.slice(0, 6)

    const rel = parseRelativeDate(text)
    const explicitDates = Array.from(text.matchAll(/(\d{4}-\d{2}-\d{2})/g)).map(m => m[1])
    let from = ""
    let to = isoDate(new Date())

    if (explicitDates.length === 1 && !rel) {
      from = explicitDates[0]
    } else if (explicitDates.length >= 2) {
      from = explicitDates[0]
      to = explicitDates[1]
    } else if (rel) {
      from = rel.from || ""
      to = rel.to || isoDate(new Date())
    }

    const resolvedSymbols: string[] = []
    for (const comp of allCompanies) {
      try {
        const r = await resolveToTicker(comp)
        if (r) resolvedSymbols.push(r)
        else resolvedSymbols.push(comp.toUpperCase().slice(0, 6))
      } catch (e) {
        resolvedSymbols.push(comp.toUpperCase().slice(0, 6))
      }
    }

    const tabs = resolvedSymbols.map((sym) => ({
      action: "display",
      tabName: `${sym.toLowerCase()}-${chartType.replace(/\s+/g, "-").toLowerCase()}`,
      symbol: sym,
      from: from || "",
      to: to || isoDate(new Date()),
      timeframe: "1D",
      chartType,
    }))

    const out = { tabs }
    setJsonOut(out)

    try {
      console.info("[astral] parsed-json:", out)
      ;(window as any).lastAstralParsed = out
      window.dispatchEvent(new CustomEvent("astral:parsed-json", { detail: out }))
      void fetch("/astral/parsed-json", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Astral-Event": "parsed-json" },
        body: JSON.stringify(out),
        keepalive: true,
      })
    } catch (e) {
      // ignore
    }

    tabs.forEach(t => {
      try {
        window.dispatchEvent(new CustomEvent("astral:chart-request", { detail: { symbol: t.symbol, from: t.from, to: t.to, chartType: t.chartType } }))
      } catch (e) {
        console.warn("dispatch error", e)
      }
    })

    // NEW: fetch time series from FMP (if key present) and dispatch a detailed chart-data event
    if (FMP_KEY && resolvedSymbols.length) {
      try {
        const fetches = resolvedSymbols.map(sym => fetchFmpHistorical(sym, from || undefined, to || undefined).then(data => ({ sym, data })))
        const results = await Promise.allSettled(fetches)
        const chartDataPayload = results.map(r => {
          if (r.status === "fulfilled") {
            return { symbol: r.value.sym, prices: r.value.data || [], from: from || "", to: to || isoDate(new Date()), chartType }
          } else {
            console.warn("FMP fetch promise rejected", r)
            return { symbol: "(error)", prices: [], from: from || "", to: to || isoDate(new Date()), chartType }
          }
        })
        window.dispatchEvent(new CustomEvent("astral:chart-data", { detail: { charts: chartDataPayload } }))
        console.info("[astral] dispatched astral:chart-data", chartDataPayload)
      } catch (e) {
        console.warn("error fetching FMP historical data", e)
      }
    } else {
      if (!FMP_KEY) console.info("[astral] no FMP key configured; skipping historical fetch")
    }

    setMessages(m => [...m, { from: "assistant", text: `I found ${resolvedSymbols.length} symbol(s): ${resolvedSymbols.join(", ") || "none"}. Preparing ${chartType} chart(s) from ${from || "N/A"} to ${to}.` }])
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
        {/* Assistant chat panel (self-contained) */}
        <div className="h-full flex flex-col border-r border-border/50 bg-background/60 p-4">
          <div className="text-lg font-semibold text-foreground mb-3">Assistant</div>

          <div className="flex-1 overflow-auto space-y-3 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-md ${m.from === "user" ? "bg-muted/40 text-foreground text-right" : "bg-muted/20 text-foreground"}`}>
                <div className="text-sm">{m.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) { postMessage(input.trim()); setInput("") } }} className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-md p-2 bg-background/80 border border-border text-foreground" placeholder="Ask: 'Plot the Heiken Ashi for Tesla for last 2 months'" />
            <button type="submit" className="px-3 py-2 rounded-md bg-primary text-primary-foreground">Send</button>
          </form>

          <div className="mt-3 text-xs text-muted-foreground">Hugging Face NER used if VITE_HF_TOKEN is set. FMP used if VITE_FMP_KEY is set.</div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel defaultSize={65} minSize={50}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={70} minSize={40}>
            <ChartCanvas />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={30} minSize={20}>
            <CodeDisplay />
            <div className="p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Parsed Output (JSON)</div>
              <pre className="text-xs">{jsonOut ? JSON.stringify(jsonOut, null, 2) : '{ \"tabs\": [] }'}</pre>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
