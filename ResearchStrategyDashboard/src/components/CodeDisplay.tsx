import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Download, Play, Code2 } from "lucide-react"
import { toast } from "sonner"

interface CodeDisplayProps {
  className?: string
}

const CodeDisplay = ({ className = "" }: CodeDisplayProps) => {
  const [hasCode, setHasCode] = useState(false)
  const [code] = useState(`import yfinance as yf
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

def analyze_stock(symbol):
    # Fetch stock data
    stock = yf.Ticker(symbol)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    # Get historical data
    data = stock.history(start=start_date, end=end_date)
    
    # Calculate moving averages
    data['MA20'] = data['Close'].rolling(window=20).mean()
    data['MA50'] = data['Close'].rolling(window=50).mean()
    
    # Calculate RSI
    delta = data['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    data['RSI'] = 100 - (100 / (1 + rs))
    
    return data

# Execute analysis
nvda_data = analyze_stock('NVDA')
print(f"Latest price: $" + "{nvda_data['Close'].iloc[-1]:.2f}")
print(f"RSI: " + "{nvda_data['RSI'].iloc[-1]:.2f}")`)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    toast("Code copied to clipboard!")
  }

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'strategy_analysis.py'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    toast("Code downloaded!")
  }

  if (!hasCode) {
    return (
      <Card className={`h-full bg-gradient-surface border-border ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Generated Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center">
              <Code2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No code generated yet</p>
            <p className="text-sm text-muted-foreground">Ask the assistant to generate analysis code</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`h-full bg-gradient-surface border-border ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Generated Code
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Python
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCode}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="default" size="sm">
              <Play className="w-4 h-4 mr-1" />
              Run
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3">
        <div className="h-full bg-background/50 border border-border/50 rounded-lg overflow-hidden">
          <pre className="h-full overflow-auto p-4 text-sm font-mono">
            <code className="text-foreground leading-relaxed">{code}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}

export default CodeDisplay