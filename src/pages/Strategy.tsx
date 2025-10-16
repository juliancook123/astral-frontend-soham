import React, { useCallback, useEffect, useRef, useState } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import ChartCanvas from "@/components/ChartCanvas"
import CodeDisplay from "@/components/CodeDisplay"
import { useStrategyAgent } from "@/agents/strategy"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ChatMessage = {
  from: "user" | "assistant"
  text: string
}

interface ChatPanelProps {
  messages: ChatMessage[]
  input: string
  isAgentRunning: boolean
  isChatExpanded: boolean
  onToggleExpand: () => void
  onInputChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  className?: string
}

function ChatPanel({
  messages,
  input,
  isAgentRunning,
  isChatExpanded,
  onToggleExpand,
  onInputChange,
  onSubmit,
  className,
}: ChatPanelProps) {
  return (
    <div className={cn("flex h-full w-full flex-col rounded-md border border-border/50 bg-background/80 p-3 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-foreground">Assistant</div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground transition hover:text-foreground"
          aria-label={isChatExpanded ? "Exit full screen chat" : "Expand chat"}
        >
          {isChatExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border/20 bg-background/60 p-3 pr-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn("rounded-md p-2 text-foreground", m.from === "user" ? "bg-muted/40 text-right" : "bg-muted/20")}
          >
            <div className="text-sm whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2" aria-busy={isAgentRunning}>
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="flex-1 rounded-md border border-border bg-background/80 p-2 text-foreground"
          placeholder={isAgentRunning ? "Agent is preparing your stream..." : "Ask for a stream: e.g. “Start BTCUSD on 1m”"}
          disabled={isAgentRunning}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isAgentRunning || !input.trim()}
        >
          {isAgentRunning ? "Working..." : "Send"}
        </button>
      </form>

      <div className="mt-3 text-xs text-muted-foreground">Responses are generated entirely by the strategy agent.</div>
    </div>
  )
}

export default function Strategy() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isCollapseHover, setIsCollapseHover] = useState(false)
  const [isExpandHover, setIsExpandHover] = useState(false)
  const [latestFunctionCall, setLatestFunctionCall] = useState<{ ticker: string; interval: string } | null>(null)
  const { runAgent } = useStrategyAgent()
  const collapseHotspotRef = useRef<HTMLDivElement | null>(null)
  const expandHotspotRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const userName = "Soham Patel"
  const HOVER_THRESHOLD = 36

  useEffect(() => {
    setMessages([{ from: "assistant", text: `Welcome ${userName}! Ask what data you’d like to see and I’ll start the stream.` }])
  }, [userName])

  useEffect(() => {
    if (isChatCollapsed) {
      setIsCollapseHover(false)
    } else {
      setIsExpandHover(false)
    }
  }, [isChatCollapsed])

  useEffect(() => {
    if (isChatExpanded) {
      setIsCollapseHover(false)
      setIsExpandHover(false)
    }
  }, [isChatExpanded])

  const postMessage = useCallback(
    async (text: string) => {
      if (isAgentRunning) return
      const trimmed = text.trim()
      if (!trimmed) return

      setMessages((prev) => [...prev, { from: "user", text: trimmed }])
      setIsAgentRunning(true)

      try {
        const { finalOutput, streams } = await runAgent(trimmed)
        const assistantText =
          typeof finalOutput === "string" && finalOutput.trim().length > 0
            ? finalOutput.trim()
            : "I started the data stream."

        setMessages((prev) => [...prev, { from: "assistant", text: assistantText }])

        let nextCall: { ticker: string; interval: string } | null = null
        if (Array.isArray(streams) && streams.length > 0) {
          const lastStream = streams[streams.length - 1]
          const payload = lastStream?.payload
          if (payload && typeof payload === "object") {
            const payloadRecord = payload as Record<string, unknown>
            const symbolRaw = payloadRecord.symbol
            const intervalRaw = payloadRecord.tf
            const symbol =
              typeof symbolRaw === "string" && symbolRaw.trim().length > 0 ? symbolRaw.trim().toUpperCase() : ""
            const interval = typeof intervalRaw === "string" && intervalRaw.trim().length > 0 ? intervalRaw.trim() : ""
            if (symbol) {
              nextCall = { ticker: symbol, interval: interval || "1h" }
            }
          }
        }
        setLatestFunctionCall(nextCall)
      } catch (error) {
        console.error("[strategy] agent call failed", error)
        const message = error instanceof Error ? error.message : String(error)
        const assistantText = `I couldn’t reach the strategy agent. ${message}`
        setMessages((prev) => [...prev, { from: "assistant", text: assistantText }])
        setLatestFunctionCall(null)
      } finally {
        setIsAgentRunning(false)
      }
    },
    [isAgentRunning, runAgent],
  )

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const next = input.trim()
      if (!next) return
      void postMessage(next)
      setInput("")
    },
    [input, postMessage],
  )

  const handleCollapseChat = useCallback(() => {
    setIsChatExpanded(false)
    setIsChatCollapsed(true)
  }, [])

  const handleRestoreChat = useCallback(() => {
    setIsChatCollapsed(false)
  }, [])

  const handlePointerTrack = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const { clientX } = event

      if (!isChatCollapsed && !isChatExpanded && collapseHotspotRef.current) {
        const rect = collapseHotspotRef.current.getBoundingClientRect()
        const near =
          clientX >= rect.left - HOVER_THRESHOLD &&
          clientX <= rect.right + HOVER_THRESHOLD
        if (near !== isCollapseHover) {
          setIsCollapseHover(near)
        }
      } else if (isCollapseHover) {
        setIsCollapseHover(false)
      }

      if (isChatCollapsed && !isChatExpanded && expandHotspotRef.current) {
        const rect = expandHotspotRef.current.getBoundingClientRect()
        const near =
          clientX >= rect.left - HOVER_THRESHOLD &&
          clientX <= rect.right + HOVER_THRESHOLD
        if (near !== isExpandHover) {
          setIsExpandHover(near)
        }
      } else if (isExpandHover) {
        setIsExpandHover(false)
      }
    },
    [HOVER_THRESHOLD, isChatCollapsed, isChatExpanded, isCollapseHover, isExpandHover],
  )

  const handlePointerLeave = useCallback(() => {
    if (isCollapseHover) {
      setIsCollapseHover(false)
    }
    if (isExpandHover) {
      setIsExpandHover(false)
    }
  }, [isCollapseHover, isExpandHover])

  useEffect(() => {
    if (isChatExpanded) {
      setIsChatCollapsed(false)
    }
  }, [isChatExpanded])

  const chatPanel = (
    <ChatPanel
      messages={messages}
      input={input}
      isAgentRunning={isAgentRunning}
      isChatExpanded={isChatExpanded}
      onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      className={isChatExpanded ? "ring-1 ring-border/60" : undefined}
    />
  )

  const chatWrapperClass = cn(
    "group/chat relative flex h-full min-w-0 items-stretch transition-all duration-300 ease-in-out",
    isChatExpanded
      ? "absolute inset-0 z-40 w-full bg-background/95 px-3 py-3 backdrop-blur-md md:px-6 md:py-6"
      : "static",
    !isChatExpanded &&
      (isChatCollapsed
        ? "w-0 min-w-0 opacity-0 pointer-events-none"
        : "flex-[0_0_33%] min-w-0 sm:min-w-[220px] md:min-w-[280px] max-w-full md:max-w-[520px]"),
    !isChatCollapsed && !isChatExpanded && "pr-0.5",
  )

  const chatContentClass = cn(
    "flex h-full w-full transition-opacity duration-200",
    isChatCollapsed && !isChatExpanded ? "pointer-events-none opacity-0" : "opacity-100",
  )

  const rightPaneClass = cn(
    "relative flex h-full min-w-0 flex-1 items-stretch transition-opacity duration-300 ease-in-out",
    isChatExpanded ? "pointer-events-none opacity-0" : "opacity-100",
  )

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-w-0 overflow-hidden bg-background"
      onMouseMove={handlePointerTrack}
      onMouseLeave={handlePointerLeave}
    >
      <div className={chatWrapperClass} aria-hidden={isChatCollapsed && !isChatExpanded}>
        <div className={chatContentClass}>
          <div className="h-full w-full p-0.5">{chatPanel}</div>
        </div>
      </div>

      {!isChatCollapsed && !isChatExpanded && (
        <div ref={collapseHotspotRef} className="relative z-30 flex h-full w-2 shrink-0 items-center justify-center">
          <span
            className={cn(
              "pointer-events-none absolute inset-y-4 right-0 w-px rounded-full transition-colors duration-150",
              isCollapseHover ? "bg-border" : "bg-border/50",
            )}
          />
          <button
            type="button"
            onClick={handleCollapseChat}
            className={cn(
              "absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition-all duration-150 hover:text-foreground",
              isCollapseHover ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0",
            )}
            aria-label="Hide chat panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={rightPaneClass}>
        <div className="flex h-full min-w-0 w-full flex-col p-0.5">
          <ResizablePanelGroup direction="vertical" className="h-full min-w-0">
            <ResizablePanel defaultSize={70} minSize={50}>
              <div className="h-full p-0.5">
                <div className="flex h-full flex-col rounded-md border border-border/40 bg-background/80 p-3">
                  <div className="h-full overflow-hidden rounded-md border border-border/30 bg-background">
                    <ChartCanvas />
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="h-full p-0.5">
                <Tabs
                  defaultValue="code"
                  className="flex h-full min-w-0 flex-col rounded-md border border-border/40 bg-background/80 p-3"
                >
                  <TabsList className="mb-1 grid h-10 grid-cols-2 gap-1 rounded-md bg-muted/20 p-1">
                    <TabsTrigger value="code">Generated Code</TabsTrigger>
                    <TabsTrigger value="metrics">Strategy Metrics</TabsTrigger>
                  </TabsList>
                  <TabsContent value="code" className="flex-1 overflow-hidden p-0">
                    <CodeDisplay className="h-full rounded-md" functionCall={latestFunctionCall} />
                  </TabsContent>
                  <TabsContent value="metrics" className="flex-1 p-0">
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-md border border-dashed border-border/40 bg-background/70 text-center">
                      <p className="text-sm font-medium text-foreground">Strategy metrics coming soon</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Metrics will appear here after the assistant runs your strategy.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {isChatCollapsed && !isChatExpanded && (
        <div ref={expandHotspotRef} className="absolute inset-y-0 left-0 z-40 flex w-3 items-center justify-center">
          <span
            className={cn(
              "pointer-events-none absolute inset-y-4 left-0 w-px rounded-full transition-colors duration-150",
              isExpandHover ? "bg-border" : "bg-border/40",
            )}
          />
          <button
            type="button"
            onClick={handleRestoreChat}
            className={cn(
              "absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm transition-all duration-150 hover:text-foreground",
              isExpandHover ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0",
            )}
            aria-label="Show chat panel"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
