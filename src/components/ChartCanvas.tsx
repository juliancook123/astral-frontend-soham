import { useEffect, useMemo, useRef, useState } from "react"
import {
  createChart,
  CandlestickSeries,
  ColorType,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStreamCandles } from "@/hooks/useStreamCandles"
import { useWebSocket } from "@/context/WebSocketProvider"

const timeframeToSeconds = (timeframe: string): number => {
  const match = timeframe.match(/^(\d+)([mhd])$/i)
  if (!match) return 0
  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  switch (unit) {
    case "m":
      return value * 60
    case "h":
      return value * 3600
    case "d":
      return value * 86400
    default:
      return 0
  }
}

export default function ChartCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const latestTimestampRef = useRef<UTCTimestamp | null>(null)
  const firstTimestampRef = useRef<UTCTimestamp | null>(null)
  const candleCountRef = useRef(0)
  const [didFit, setDidFit] = useState(false)

  const { status } = useWebSocket()
  const { candles, meta, latest } = useStreamCandles()

  const { formatTimestampLabel, formatAxisTime } = useMemo(() => {
    const axisFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    const formatTimestampLabel = (timestamp?: UTCTimestamp) => {
      if (!timestamp) return "—"
      const date = new Date(Number(timestamp) * 1000)
      if (Number.isNaN(date.getTime())) return "—"
      return dateTimeFormatter.format(date)
    }

    const formatAxisTime = (time: Time) => {
      if (typeof time === "number") {
        return axisFormatter.format(new Date(time * 1000))
      }
      const { year, month, day } = time
      const date = new Date(Date.UTC(year, month - 1, day))
      return dateTimeFormatter.format(date)
    }

    return { formatTimestampLabel, formatAxisTime }
  }, [])

  const chartOptions = useMemo(
    () => ({
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cbd5f5",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.15)" },
        horzLines: { color: "rgba(148, 163, 184, 0.15)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.4)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.4)",
        rightOffset: 4,
        barSpacing: 8,
      },
      crosshair: {
        mode: 1,
      },
      localization: {
        timeFormatter: formatAxisTime,
      },
    }),
    [formatAxisTime],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const initialWidth = Math.max(100, rect.width || container.clientWidth || 600)
    const initialHeight = Math.max(100, rect.height || container.clientHeight || 400)

    const chart = createChart(container, {
      ...chartOptions,
      width: initialWidth,
      height: initialHeight,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry?.contentRect) return
      const { width, height } = entry.contentRect
      chart.resize(Math.max(100, width), Math.max(100, height || initialHeight))
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      latestTimestampRef.current = null
    }
  }, [chartOptions])

  useEffect(() => {
    if (!seriesRef.current) return

    if (!candles.length) {
      seriesRef.current.setData([])
      latestTimestampRef.current = null
      firstTimestampRef.current = null
      candleCountRef.current = 0
      setDidFit(false)
      return
    }

    const latestCandle = candles[candles.length - 1]
    const firstCandle = candles[0]
    const latestTimestamp = latestCandle.time as UTCTimestamp
    const firstTimestamp = firstCandle.time as UTCTimestamp

    const previousCount = candleCountRef.current
    const previousFirst = firstTimestampRef.current
    const previousLatest = latestTimestampRef.current

    const countChanged = previousCount !== candles.length
    const firstChanged = previousFirst !== firstTimestamp
    const needsFullRefresh = previousCount === 0 || countChanged || firstChanged

    let shouldFit = false

    if (needsFullRefresh) {
      seriesRef.current.setData(candles)
      shouldFit = true
    } else {
      seriesRef.current.update(latestCandle)
      if (previousLatest !== latestTimestamp) {
        shouldFit = true
      }
    }

    candleCountRef.current = candles.length
    firstTimestampRef.current = firstTimestamp
    latestTimestampRef.current = latestTimestamp

    if (shouldFit || !didFit) {
      chartRef.current?.timeScale().fitContent()
      setDidFit(true)
    }
  }, [candles, didFit])

  useEffect(() => {
    if (!chartRef.current || !meta?.timeframe) return
    const seconds = timeframeToSeconds(meta.timeframe)
    chartRef.current.timeScale().applyOptions({
      timeVisible: seconds > 0 && seconds < 86400,
      secondsVisible: seconds > 0 && seconds <= 60,
    })
  }, [meta?.timeframe])

  return (
    <Card className="flex h-full flex-col bg-gradient-surface border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">Live Market Stream</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={status === "open" ? "success" : status === "connecting" ? "secondary" : "outline"}>
            {status === "open" ? "Socket Connected" : status === "connecting" ? "Connecting..." : "Offline"}
          </Badge>
          {meta ? (
            <span>
              {meta.symbol} · {meta.timeframe} · {formatTimestampLabel(latest?.time)}
            </span>
          ) : (
            <span>No active stream</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div ref={containerRef} className="h-full min-h-0 rounded-lg border border-border/40 bg-background/40" />
      </CardContent>
    </Card>
  )
}
