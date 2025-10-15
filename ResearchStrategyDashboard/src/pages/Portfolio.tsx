import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, PieChart, Eye } from "lucide-react"

const Portfolio = () => {
  const holdings = [
    { symbol: "NVDA", name: "NVIDIA Corporation", shares: 50, avgPrice: 120.50, currentPrice: 141.36, allocation: 35 },
    { symbol: "AAPL", name: "Apple Inc.", shares: 25, avgPrice: 175.20, currentPrice: 187.44, allocation: 20 },
    { symbol: "TSLA", name: "Tesla, Inc.", shares: 15, avgPrice: 245.80, currentPrice: 267.82, allocation: 18 },
    { symbol: "GOOGL", name: "Alphabet Inc.", shares: 10, avgPrice: 135.90, currentPrice: 142.17, allocation: 15 },
    { symbol: "MSFT", name: "Microsoft Corporation", shares: 8, avgPrice: 320.10, currentPrice: 338.25, allocation: 12 },
  ]

  const calculatePnL = (shares: number, avgPrice: number, currentPrice: number) => {
    const value = shares * (currentPrice - avgPrice)
    return { value, percentage: ((currentPrice - avgPrice) / avgPrice) * 100 }
  }

  const totalValue = holdings.reduce((sum, holding) => sum + (holding.shares * holding.currentPrice), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
          <p className="text-muted-foreground mt-1">Track your investments and performance</p>
        </div>
        <Button variant="premium">
          <Eye className="w-4 h-4 mr-2" />
          View Report
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className="text-2xl font-bold text-success">+$4,235</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Day Change</p>
                <p className="text-2xl font-bold text-success">+$187</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Holdings</p>
                <p className="text-2xl font-bold text-foreground">{holdings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card className="bg-gradient-surface border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Symbol</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Shares</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Avg Price</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Current Price</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Market Value</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">P&L</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => {
                  const pnl = calculatePnL(holding.shares, holding.avgPrice, holding.currentPrice)
                  const marketValue = holding.shares * holding.currentPrice
                  
                  return (
                    <tr key={holding.symbol} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{holding.symbol}</p>
                          <p className="text-xs text-muted-foreground">{holding.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{holding.shares}</td>
                      <td className="p-4 text-foreground">${holding.avgPrice.toFixed(2)}</td>
                      <td className="p-4 text-foreground">${holding.currentPrice.toFixed(2)}</td>
                      <td className="p-4 text-foreground">${marketValue.toLocaleString()}</td>
                      <td className="p-4">
                        <div className={`${pnl.value >= 0 ? 'text-success' : 'text-danger'}`}>
                          <p className="font-medium">${pnl.value >= 0 ? '+' : ''}{pnl.value.toFixed(0)}</p>
                          <p className="text-xs">{pnl.percentage >= 0 ? '+' : ''}{pnl.percentage.toFixed(1)}%</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Progress value={holding.allocation} className="w-16" />
                          <span className="text-sm text-muted-foreground">{holding.allocation}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Allocation */}
      <Card className="bg-gradient-surface border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border border-chart-grid">
            <div className="text-center">
              <PieChart className="w-16 h-16 text-chart-line mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Interactive Portfolio Chart</h3>
              <p className="text-muted-foreground">Visual breakdown of your portfolio allocation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Portfolio