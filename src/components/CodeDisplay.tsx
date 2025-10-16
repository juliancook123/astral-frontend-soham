import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Code2, Info } from "lucide-react"

interface CodeDisplayProps {
  className?: string
  functionCall?: {
    ticker: string
    interval: string
  } | null
}

const CodeDisplay = ({ className = "", functionCall }: CodeDisplayProps) => {
  const hasCall = Boolean(functionCall?.ticker && functionCall?.interval)

  const signature = hasCall
    ? `get_stock_data(ticker="${functionCall?.ticker}", interval="${functionCall?.interval}")`
    : ""

  return (
      <CardContent className="flex flex-1 w-full flex-col gap-4 pt-0 p-0 h-full">
        {hasCall ? (
          <div className="h-full min-h-[160px] rounded-lg bg-background/70 shadow-inner">
            <pre className="h-full whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-relaxed text-foreground">
              {signature}
            </pre>
          </div>
        ) : (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-background/60 px-6 text-center">
            <Info className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Strategy code will appear here once the agent starts a data stream.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">Ask the assistant for market data to see the function call.</p>
          </div>
        )}
      </CardContent>
  )
}

export default CodeDisplay
