import { useEffect, useMemo, useRef, useState } from "react"
import { type CandlestickData, type UTCTimestamp } from "lightweight-charts"
import { useWebSocket } from "@/context/WebSocketProvider"

type StartStreamAck = {
  t: "start_stream_ack"
  symbol: string
  tf: string
  session_id: string
}

type PartialBar = {
  t: "partial_bar"
  asof?: string
  symbol: string
  tf: string
  bar_time: string
  open: number
  high: number
  low: number
  last?: number
  close?: number
  volume?: number
  pct_complete?: number
}

type BarClose = {
  t: "bar_close"
  asof?: string
  symbol: string
  tf: string
  bar_time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

type IncomingFrame = StartStreamAck | PartialBar | BarClose | Record<string, unknown>

export type StreamMeta = {
  symbol: string
  timeframe: string
  sessionId: string
  lastUpdated?: string
}

type StreamState = {
  meta: StreamMeta | null
  candles: CandlestickData[]
}

const SESSION_ID = "session-local"

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

const toTimestamp = (iso: string): UTCTimestamp => (Math.floor(new Date(iso).getTime() / 1000) as UTCTimestamp)

const toCandle = (frame: PartialBar | BarClose): CandlestickData => {
  const time = toTimestamp(frame.bar_time)
  const open = Number(frame.open)
  const high = Number(frame.high)
  const low = Number(frame.low)
  const close =
    typeof (frame as BarClose).close === "number"
      ? Number((frame as BarClose).close)
      : typeof frame.last === "number"
      ? Number(frame.last)
      : Number(frame.close ?? frame.open)
  return { time, open, high, low, close }
}

const mergeCandles = (existing: Map<number, CandlestickData>, candle: CandlestickData) => {
  existing.set(candle.time as number, candle)
}

export function useStreamCandles() {
  const { client } = useWebSocket()
  const dataMapRef = useRef<Map<number, CandlestickData>>(new Map())
  const metaRef = useRef<StreamMeta | null>(null)
  const partialRef = useRef<PartialBar | null>(null)
  const [state, setState] = useState<StreamState>({ meta: null, candles: [] })

  useEffect(() => {
    if (!client) return

    const unsubscribe = client.subscribeRaw((frame: IncomingFrame) => {
      if (!frame || typeof frame !== "object" || !("t" in frame)) return

      if (frame.t === "start_stream_ack" && frame.session_id === SESSION_ID) {
        dataMapRef.current = new Map()
        partialRef.current = null
        const meta: StreamMeta = {
          symbol: frame.symbol,
          timeframe: frame.tf,
          sessionId: frame.session_id,
          lastUpdated: new Date().toISOString(),
        }
        metaRef.current = meta
        setState({ meta, candles: [] })
        return
      }

      if (frame.t === "partial_bar") {
        const active = metaRef.current
        if (!active) return
        if (frame.symbol !== active.symbol || frame.tf !== active.timeframe) return

        partialRef.current = frame
        const candle = toCandle(frame)
        mergeCandles(dataMapRef.current, candle)

        setState({
          meta: {
            ...active,
            lastUpdated: frame.asof ?? new Date().toISOString(),
          },
          candles: Array.from(dataMapRef.current.values()).sort((a, b) => Number(a.time) - Number(b.time)),
        })
        return
      }

      if (frame.t === "bar_close") {
        const active = metaRef.current
        if (!active) return
        if (frame.symbol !== active.symbol || frame.tf !== active.timeframe) return

        const candle = toCandle(frame)
        mergeCandles(dataMapRef.current, candle)

        // Immediately seed next partial candle so the chart advances
        const step = timeframeToSeconds(active.timeframe)
        if (step > 0) {
          const nextTimeIso = new Date((Number(candle.time) + step) * 1000).toISOString()
          partialRef.current = {
            t: "partial_bar",
            symbol: frame.symbol,
            tf: frame.tf,
            bar_time: nextTimeIso,
            open: candle.close,
            high: candle.close,
            low: candle.close,
            last: candle.close,
            volume: 0,
            pct_complete: 0,
          }
          const nextCandle = toCandle(partialRef.current)
          mergeCandles(dataMapRef.current, nextCandle)
        } else {
          partialRef.current = null
        }

        setState({
          meta: {
            ...active,
            lastUpdated: frame.asof ?? new Date().toISOString(),
          },
          candles: Array.from(dataMapRef.current.values()).sort((a, b) => Number(a.time) - Number(b.time)),
        })
      }
    })

    return () => unsubscribe()
  }, [client])

  const info = useMemo(() => {
    const candles = state.candles
    const last = candles.length ? candles[candles.length - 1] : undefined
    return {
      candles,
      meta: state.meta,
      latest: last,
    }
  }, [state])

  return info
}
