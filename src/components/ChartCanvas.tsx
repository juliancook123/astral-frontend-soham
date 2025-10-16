// ChartCanvas.tsx
import React, { useEffect, useRef, useState } from "react"
import { Canvas as FabricCanvas, Line as FabricLine, Rect, Circle as FabricCircle, Text } from "fabric"
import ReactApexChart from "react-apexcharts"
import ApexCharts from "apexcharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Pen, Move, Square, Circle, Trash2, Download } from "lucide-react"
import { toast } from "sonner"

interface ChartCanvasProps {
  className?: string
}

type TabSpec = {
  action?: string
  tabName?: string
  symbol: string
  from?: string
  to?: string
  timeframe?: string
  chartType?: string
}

type ChartState = {
  tab: TabSpec
  loading: boolean
  error?: string | null
  rows: Array<{ date: string; open: number; high: number; low: number; close: number }>
  resolvedTicker?: string | null
}

const FMP_KEY = import.meta.env.VITE_FMP_KEY || ""

export default function ChartCanvas({ className = "" }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null)
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "rectangle" | "circle">("select")
  const [parsedJson, setParsedJson] = useState<any | null>(null)
  const [charts, setCharts] = useState<ChartState[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  // sizing refs and state
  const rootRef = useRef<HTMLDivElement | null>(null) // NEW: container that wraps Card (measured)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const titleStripRef = useRef<HTMLDivElement | null>(null)
  const outerChartContainerRef = useRef<HTMLDivElement | null>(null)
  const fullSectionRef = useRef<HTMLDivElement | null>(null)
  const apexRef = useRef<any>(null)

  const [chartHeightPx, setChartHeightPx] = useState<number>(400)

  /* ------------------------------- fabric init ------------------------------ */
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 400,
      backgroundColor: "#1a1b23",
    })

    drawGrid(canvas)
    try {
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = "#3b82f6"
        canvas.freeDrawingBrush.width = 2
      }
    } catch {}

    setFabricCanvas(canvas)
    return () => {
      try { canvas.dispose() } catch {}
    }
  }, [])

  useEffect(() => {
    if (!fabricCanvas) return
    fabricCanvas.isDrawingMode = activeTool === "draw"
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = "#3b82f6"
      fabricCanvas.freeDrawingBrush.width = 2
    }
  }, [activeTool, fabricCanvas])
  /* ------------------------------------------------------------------------- */

  /* ------------------------------- data utils ------------------------------ */
  function toRows(data: any, from?: string, to?: string) {
    let rows: Array<{ date: string; open: number; high: number; low: number; close: number }> = []
    const maybeArray = Array.isArray(data) ? data : (Array.isArray(data?.historical) ? data.historical : null)
    if (maybeArray) {
      rows = maybeArray
        .map((d: any) => {
          const date = d.date || d.datetime || d.timestamp
          const open = Number(d.open ?? d["1. open"] ?? d.O ?? NaN)
          const high = Number(d.high ?? d["2. high"] ?? d.H ?? NaN)
          const low = Number(d.low ?? d["3. low"] ?? d.L ?? NaN)
          const close = Number(d.close ?? d["4. close"] ?? d.C ?? NaN)
          return { date, open, high, low, close }
        })
        .filter(d => d.date && [d.open, d.high, d.low, d.close].every(Number.isFinite))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } else {
      const daily = data?.["Time Series (Daily)"] || {}
      rows = Object.entries(daily)
        .map(([date, v]: any) => ({
          date,
          open: parseFloat(v["1. open"]),
          high: parseFloat(v["2. high"]),
          low: parseFloat(v["3. low"]),
          close: parseFloat(v["4. close"]),
        }))
        .filter((d: any) => [d.open, d.high, d.low, d.close].every(Number.isFinite))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    const fromT = from ? new Date(from).getTime() : -Infinity
    const toT = to ? new Date(to).getTime() : Infinity
    return rows.filter((d: any) => {
      const t = new Date(d.date).getTime()
      return t >= fromT && t <= toT
    })
  }

  function rowsToOhlcSeries(rows: any[]) { return rows.map(d => ({ x: new Date(d.date), y: [d.open, d.high, d.low, d.close] })) }
  function rowsToLineSeries(rows: any[]) { return rows.map(d => ({ x: new Date(d.date), y: d.close })) }

  function toHeikinAshi(rows: any[]) {
    if (!rows.length) return []
    const out: Array<{ x: Date; y: [number, number, number, number] }> = []
    let prevHAOpen = (rows[0].open + rows[0].close) / 2
    let prevHAClose = (rows[0].open + rows[0].high + rows[0].low + rows[0].close) / 4
    for (let i = 0; i < rows.length; i++) {
      const { open, high, low, close, date } = rows[i]
      const haClose = (open + high + low + close) / 4
      const haOpen = (prevHAOpen + prevHAClose) / 2
      const haHigh = Math.max(high, haOpen, haClose)
      const haLow = Math.min(low, haOpen, haClose)
      out.push({ x: new Date(date), y: [haOpen, haHigh, haLow, haClose] })
      prevHAOpen = haOpen
      prevHAClose = haClose
    }
    return out
  }
  /* ------------------------------------------------------------------------- */

  // helper: detect tickers vs company names
  function looksLikeTicker(s: string) {
    if (/^[A-Z0-9]{1,5}$/.test(s)) return true
    if (/^[A-Z0-9]{1,4}\.[A-Z0-9]{1,3}$/.test(s)) return true
    return false
  }

  async function lookupTickerFromFmp(query: string): Promise<string | null> {
    if (!FMP_KEY) return null
    try {
      const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=10&exchange=&apikey=${FMP_KEY}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) return null
      const upq = query.toUpperCase().trim()
      const exactSymbol = data.find((d: any) => String(d.symbol || "").toUpperCase() === upq)
      if (exactSymbol) return exactSymbol.symbol
      const exactName = data.find((d: any) => String(d.name || "").toUpperCase() === upq)
      if (exactName) return exactName.symbol
      return data[0].symbol || null
    } catch (e) {
      console.warn("lookupTickerFromFmp error", e)
      return null
    }
  }

  async function resolveTicker(symbolOrName: string): Promise<{ ticker: string | null; warning?: string | null }> {
    if (!symbolOrName) return { ticker: null, warning: "Empty symbol" }
    const raw = String(symbolOrName).trim()
    const upper = raw.toUpperCase().replace(/\s+/g, " ").trim()
    const token = upper.replace(/\s+/g, "")
    if (looksLikeTicker(token)) return { ticker: token }
    if (!FMP_KEY) return { ticker: null, warning: "VITE_FMP_KEY not set — cannot resolve company names to tickers automatically." }
    const looked = await lookupTickerFromFmp(raw)
    if (looked) return { ticker: looked }
    return { ticker: null, warning: `Could not resolve '${raw}' to a ticker via FMP. Please provide a canonical ticker (e.g. ORCL for Oracle).` }
  }

  // fetch historicals by ticker (always ticker)
  async function fetchFmpHistorical(symbol: string, from?: string, to?: string): Promise<any[]> {
    if (!FMP_KEY) return []
    try {
      const end = to || new Date().toISOString().slice(0, 10)
      let start = from
      if (!start) {
        const d = new Date()
        d.setMonth(d.getMonth() - 6)
        start = d.toISOString().slice(0, 10)
      }
      const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?from=${start}&to=${end}&apikey=${FMP_KEY}`
      const res = await fetch(url)
      if (!res.ok) return []
      const data = await res.json()
      if (Array.isArray(data)) return data
      return Array.isArray(data?.historical) ? data.historical : []
    } catch (e) {
      console.warn("fetchFmpHistorical error", e)
      return []
    }
  }

  // fetch and set chart rows for a tab
  async function fetchTimeSeriesForTab(tab: TabSpec) {
    const { ticker, warning } = await resolveTicker(tab.symbol)
    const resolvedTicker = ticker
    const keyTicker = resolvedTicker ?? tab.symbol
    const key = `${keyTicker}-${tab.from || ""}-${tab.to || ""}`

    if (abortControllersRef.current[key]) {
      try { abortControllersRef.current[key].abort() } catch {}
    }
    const ac = new AbortController()
    abortControllersRef.current[key] = ac

    setCharts(prev => {
      const exists = prev.find(c => c.tab.symbol === tab.symbol && c.tab.from === tab.from && c.tab.to === tab.to)
      if (exists) {
        return prev.map(c => (c.tab.symbol === tab.symbol && c.tab.from === tab.from && c.tab.to === tab.to ? { ...c, loading: true, error: null, resolvedTicker: resolvedTicker ?? null } : c))
      }
      return [...prev, { tab, loading: true, error: null, rows: [], resolvedTicker: resolvedTicker ?? null }]
    })

    if (!resolvedTicker) {
      setCharts(prev => prev.map(c => (c.tab.symbol === tab.symbol && c.tab.from === tab.from && c.tab.to === tab.to) ? { ...c, loading: false, error: warning ?? "Unable to resolve ticker", rows: [], resolvedTicker: null } : c))
      return
    }

    try {
      const data = await fetchFmpHistorical(resolvedTicker, tab.from, tab.to)
      const rows = toRows(data, tab.from, tab.to)
      setCharts(prev => prev.map(c => (c.tab.symbol === tab.symbol && c.tab.from === tab.from && c.tab.to === tab.to) ? { ...c, loading: false, error: rows.length === 0 ? "No data in range" : null, rows, resolvedTicker } : c))
    } catch (err: any) {
      if (err?.name === "AbortError") return
      console.warn("[ChartCanvas] fetch error", err)
      setCharts(prev => prev.map(c => (c.tab.symbol === tab.symbol && c.tab.from === tab.from && c.tab.to === tab.to) ? { ...c, loading: false, error: String(err?.message || err), rows: [], resolvedTicker } : c))
    } finally {
      delete abortControllersRef.current[key]
    }
  }

  // when parsed-json event arrives, build tabs and fetch
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail
      setParsedJson(detail)
      const tabs: TabSpec[] = Array.isArray(detail?.tabs) ? detail.tabs : []
      const initial = tabs.map((t) => ({ tab: t, loading: true, error: null, rows: [], resolvedTicker: null }))
      setCharts(initial)
      setActiveIndex(initial.length ? initial.length - 1 : 0)
      tabs.forEach((t) => { void fetchTimeSeriesForTab(t) })
    }
    window.addEventListener("astral:parsed-json", handler)
    return () => window.removeEventListener("astral:parsed-json", handler)
  }, [])

  // RESIZE OBSERVER: measure available height from root and header/tabs/title heights
  useEffect(() => {
    function updateChartHeight() {
      const rootH = rootRef.current?.clientHeight ?? 0
      const headerH = headerRef.current?.clientHeight ?? 0
      const tabsH = tabsRef.current?.clientHeight ?? 0
      const titleH = titleStripRef.current?.clientHeight ?? 0

      // subtract some padding for borders/margins (safe)
      const available = Math.max(100, rootH - headerH - tabsH - titleH - 24)
      const clamped = Math.min(2000, Math.round(available))
      setChartHeightPx(clamped)

      // ensure Apex resizes (chart id uses activeIndex so each tab gets unique id)
      const id = `astral-chart-${activeIndex}`
      try {
        ApexCharts.exec(id, "updateOptions", { chart: { height: clamped } }, false, true)
      } catch (e) {
        // ignore - exec may fail before the chart mounts
      }
    }

    updateChartHeight()
    const ro = new ResizeObserver(() => updateChartHeight())

    if (rootRef.current) ro.observe(rootRef.current)
    if (headerRef.current) ro.observe(headerRef.current)
    if (tabsRef.current) ro.observe(tabsRef.current)
    if (titleStripRef.current) ro.observe(titleStripRef.current)
    window.addEventListener("resize", updateChartHeight)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updateChartHeight)
    }
    // include charts length/activeIndex so the id updates when active tab changes
  }, [charts.length, activeIndex])

  // toolbar handlers and small utilities
  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool)
    if (tool === "rectangle" && fabricCanvas) {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: "#3b82f6",
        strokeWidth: 2,
        width: 100,
        height: 60,
      })
      fabricCanvas.add(rect)
    } else if (tool === "circle" && fabricCanvas) {
      const circle = new FabricCircle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: "#3b82f6",
        strokeWidth: 2,
        radius: 30,
      })
      fabricCanvas.add(circle)
    }
  }

  const handleClear = () => {
    Object.values(abortControllersRef.current).forEach(ac => {
      try { ac.abort() } catch {}
    })
    abortControllersRef.current = {}
    setParsedJson(null)
    setCharts([])
    setActiveIndex(0)
    if (!fabricCanvas) return
    fabricCanvas.clear()
    fabricCanvas.backgroundColor = "#1a1b23"
    drawGrid(fabricCanvas)
    fabricCanvas.renderAll()
    toast("Canvas & charts cleared!")
  }

  const handleDownload = () => {
    if (!fabricCanvas) {
      toast("No canvas to download")
      return
    }
    try {
      const dataURL = fabricCanvas.toDataURL({ format: "png", quality: 1, multiplier: 1 })
      const link = document.createElement("a")
      link.download = "chart-analysis.png"
      link.href = dataURL
      link.click()
      toast("Chart downloaded!")
    } catch (e) {
      toast("Failed to download")
    }
  }

  function closeTab(idx: number) {
    setCharts(prev => {
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      if (next.length === 0) {
        setActiveIndex(0)
      } else if (idx === activeIndex) {
        setActiveIndex(Math.max(0, idx - 1))
      } else if (idx < activeIndex) {
        setActiveIndex(activeIndex - 1)
      }
      return next
    })
  }

  function drawGrid(canvas: FabricCanvas) {
    const gridSize = 40
    const width = canvas.width || 800
    const height = canvas.height || 400
    for (let i = 0; i <= width; i += gridSize) {
      canvas.add(new FabricLine([i, 0, i, height], { stroke: "#374151", strokeWidth: 1, selectable: false, evented: false }))
    }
    for (let i = 0; i <= height; i += gridSize) {
      canvas.add(new FabricLine([0, i, width, i], { stroke: "#374151", strokeWidth: 1, selectable: false, evented: false }))
    }
    for (let i = 0; i <= 12; i++) {
      const y = height - (i * (height / 12))
      canvas.add(new Text(i.toString(), { left: 10, top: y - 10, fontSize: 12, fill: "#9ca3af", selectable: false, evented: false }))
    }
  }

  function createApexOptions(isLine: boolean) {
    const base: any = {
      chart: { background: "#0f1420", toolbar: { show: false } },
      theme: { mode: "dark" },
      grid: { borderColor: "#1f2942" },
      xaxis: { type: "datetime", labels: { style: { colors: "#a9b1c7" } } },
      yaxis: { labels: { style: { colors: "#a9b1c7" } }, decimalsInFloat: 2 },
      tooltip: { theme: "dark", shared: false, intersect: true },
      markers: { size: 0, hover: { sizeOffset: 3 } },
    }
    if (isLine) {
      return {
        ...base,
        stroke: { width: 2, curve: "straight" },
        tooltip: { ...base.tooltip, y: { formatter: (v: any) => (v == null ? "" : Number(v).toFixed(2)) } },
      }
    }
    return {
      ...base,
      plotOptions: {
        candlestick: { colors: { upward: "#33c27f", downward: "#ff4d4d" }, wick: { useFillColor: true } }
      },
      tooltip: {
        ...base.tooltip,
        custom: ({ seriesIndex, dataPointIndex, w }: any) => {
          const o = w.globals.seriesCandleO?.[seriesIndex]?.[dataPointIndex]
          const h = w.globals.seriesCandleH?.[seriesIndex]?.[dataPointIndex]
          const l = w.globals.seriesCandleL?.[seriesIndex]?.[dataPointIndex]
          const c = w.globals.seriesCandleC?.[seriesIndex]?.[dataPointIndex]
          if ([o, h, l, c].some(v => v == null)) return undefined
          return `
            <div style="padding:8px 10px">
              <div>Open: <b>${o.toFixed(2)}</b></div>
              <div>High: <b>${h.toFixed(2)}</b></div>
              <div>Low: <b>${l.toFixed(2)}</b></div>
              <div>Close: <b>${c.toFixed(2)}</b></div>
            </div>
          `
        }
      }
    }
  }

  // ---------- render ----------
  return (
    // wrap everything in rootRef so we can measure the full available area reliably
    <div ref={rootRef} className={`h-full ${className}`} style={{ minHeight: 0 }}>
      <Card className="h-full bg-gradient-surface border-border">
        {/* headerRef wraps the header so we can measure it separately */}
        <div ref={headerRef}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chart Analysis</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant={activeTool === "select" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("select")}><Move className="w-4 h-4" /></Button>
                <Button variant={activeTool === "draw" ? "default" : "outline"} size="sm" onClick={() => setActiveTool("draw")}><Pen className="w-4 h-4" /></Button>
                <Button variant={activeTool === "rectangle" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("rectangle")}><Square className="w-4 h-4" /></Button>
                <Button variant={activeTool === "circle" ? "default" : "outline"} size="sm" onClick={() => handleToolClick("circle")}><Circle className="w-4 h-4" /></Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="outline" size="sm" onClick={handleClear}><Trash2 className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={handleDownload}><Download className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
        </div>

        {/* CardContent must be full height and overflow-hidden so children can flex-grow */}
        <CardContent className="flex-1 p-0 overflow-hidden" style={{ minHeight: 0 }}>
          <div className="h-full p-0 flex flex-col relative" style={{ minHeight: 0, height: "100%" }}>
            {/* Tabs row */}
            <div className="px-3 py-2 bg-background/60 border-b border-border/20 z-20" ref={tabsRef}>
              <div className="flex items-center gap-2 overflow-x-auto">
                {charts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No charts yet — request one from the chat</div>
                ) : (
                  charts.map((c, idx) => {
                    const title = c.tab.tabName || c.tab.symbol || `Chart ${idx + 1}`
                    const resolvedSuffix = c.resolvedTicker ? ` → ${c.resolvedTicker}` : ""
                    const isActive = idx === activeIndex
                    return (
                      <div
                        key={`${title}-${idx}`}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-md cursor-pointer select-none ${isActive ? "bg-muted text-white" : "bg-background/70 text-muted-foreground"}`}
                        onClick={() => setActiveIndex(idx)}
                      >
                        <div className="text-xs font-medium">{title}{resolvedSuffix}</div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); closeTab(idx) }}
                          title="Close tab"
                          className="ml-1 text-xs rounded px-1 hover:bg-background/60"
                          aria-label={`Close ${title}`}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* full-section background (non-interactive) */}
            <div
              ref={fullSectionRef}
              className="absolute inset-0 z-0"
              style={{
                background: "linear-gradient(180deg, rgba(10,12,16,0.5), rgba(8,9,12,0.6))",
                borderRadius: 8,
                padding: 0,
                pointerEvents: "none",
              }}
            >
              <div style={{ height: "100%", width: "100%" }} />
            </div>

            {/* Chart container (measured & flex-grow) */}
            <div
              className="flex-1 z-10"
              style={{ minHeight: 0, height: "100%" }}
              ref={outerChartContainerRef}
            >
              {charts.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
                      <Square className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No chart data available</p>
                    <p className="text-sm text-muted-foreground">Request a chart from the chat to start analyzing</p>
                    <p className="text-xs text-muted-foreground mt-2">Parsed JSON (console): <code>window.lastAstralParsed</code></p>
                  </div>
                </div>
              ) : (
                (() => {
                  const c = charts[Math.min(activeIndex, charts.length - 1)]
                  if (!c) return <div className="p-3 text-sm text-muted-foreground">No data to render</div>

                  const t = c.tab
                  const chartType = String((t.chartType || "").toLowerCase())
                  const isLine = chartType.includes("line")
                  let series: any[] = []
                  let apexType: any = isLine ? "line" : "candlestick"

                  if (c.rows.length === 0) {
                    series = []
                  } else if (chartType.includes("heikin") || chartType.includes("heiken")) {
                    const data = toHeikinAshi(c.rows)
                    series = [{ name: "Heikin Ashi", data }]
                    apexType = "candlestick"
                  } else if (isLine) {
                    series = [{ name: "Close", data: rowsToLineSeries(c.rows) }]
                  } else {
                    series = [{ name: "Candles", data: rowsToOhlcSeries(c.rows) }]
                  }

                  // build options and include unique chart id + current numeric height
                  const options = createApexOptions(isLine)
                  options.chart = { ...(options.chart || {}), id: `astral-chart-${activeIndex}`, background: options.chart?.background ?? "#0f1420", toolbar: options.chart?.toolbar ?? { show: false } }

                  return (
                    <div className="h-full rounded border border-border/40 overflow-hidden bg-background/60 flex flex-col" style={{ minHeight: 0, height: "100%" }}>
                      <div className="px-3 py-2 bg-background/60 text-xs text-muted-foreground" ref={titleStripRef}>
                        {(t.tabName || "")} • requested: {t.symbol}{c.resolvedTicker ? ` → ${c.resolvedTicker}` : ""} • {t.chartType || ""} • {t.from || ""} → {t.to || ""}
                      </div>

                      {/* full-height chart area */}
                      <div className="flex-1 overflow-hidden" style={{ minHeight: 0, height: "100%" }}>
                        {c.loading ? (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading data…</div>
                        ) : c.error ? (
                          <div className="p-3 text-sm text-red-300">Error: {c.error}</div>
                        ) : series.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground">No data to render</div>
                        ) : (
                          <div className="h-full" style={{ minHeight: 0, overflow: "hidden", height: "100%" }}>
                            <ReactApexChart
                              ref={apexRef}
                              options={options}
                              series={series}
                              type={apexType as any}
                              height={chartHeightPx}
                              width="100%"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
