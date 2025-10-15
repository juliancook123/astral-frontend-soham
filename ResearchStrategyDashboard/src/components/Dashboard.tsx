import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap } from "lucide-react"

// Mock data for trading metrics
const tradingMetrics = [
  {
    title: "Net Profit",
    value: "$2,847.52",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign
  },
  {
    title: "Win Rate",
    value: "68.4%",
    change: "+2.1%",
    trend: "up",
    icon: Target
  },
  {
    title: "Active Trades",
    value: "23",
    change: "-3",
    trend: "down",
    icon: Activity
  },
  {
    title: "Profit Factor",
    value: "2.1",
    change: "+0.3",
    trend: "up",
    icon: TrendingUp
  }
]

const recentTrades = [
  { symbol: "NVDA", type: "BUY", price: "$141.36", profit: "+$312", time: "2m ago", status: "closed" },
  { symbol: "AAPL", type: "SELL", price: "$187.44", profit: "-$89", time: "15m ago", status: "closed" },
  { symbol: "TSLA", type: "BUY", price: "$267.82", profit: "+$156", time: "1h ago", status: "open" },
  { symbol: "GOOGL", type: "BUY", price: "$142.17", profit: "+$89", time: "2h ago", status: "closed" },
]

export function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, here's your trading overview</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-border hover:bg-muted/50">
            <Activity className="w-4 h-4 mr-2" />
            View Report
          </Button>
          <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
            <Zap className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tradingMetrics.map((metric, index) => (
          <Card key={metric.title} className="bg-gradient-surface border-border hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <metric.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    metric.trend === 'up' ? 'text-success' : 'text-danger'
                  }`}>
                    {metric.trend === 'up' ? 
                      <TrendingUp className="w-4 h-4" /> : 
                      <TrendingDown className="w-4 h-4" />
                    }
                    {metric.change}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <Card className="lg:col-span-2 bg-gradient-surface border-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center justify-between">
              <span>Portfolio Performance</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs">1D</Button>
                <Button variant="ghost" size="sm" className="text-xs">1W</Button>
                <Button variant="secondary" size="sm" className="text-xs">1M</Button>
                <Button variant="ghost" size="sm" className="text-xs">3M</Button>
                <Button variant="ghost" size="sm" className="text-xs">1Y</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border border-chart-grid">
              <div className="text-center">
                <Activity className="w-12 h-12 text-chart-line mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Chart will be integrated with your trading data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="bg-gradient-surface border-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {recentTrades.map((trade, index) => (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      trade.type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>
                      {trade.type}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{trade.symbol}</p>
                      <p className="text-xs text-muted-foreground">{trade.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${
                      trade.profit.startsWith('+') ? 'text-success' : 'text-danger'
                    }`}>
                      {trade.profit}
                    </p>
                    <p className="text-xs text-muted-foreground">{trade.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Performance */}
      <Card className="bg-gradient-surface border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle>Strategy Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-success/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground">Astral Signal</h3>
              <p className="text-2xl font-bold text-success mt-1">+89%</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Momentum Pro</h3>
              <p className="text-2xl font-bold text-primary mt-1">+62%</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/20 border border-border">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/40 flex items-center justify-center">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Swing Trade</h3>
              <p className="text-2xl font-bold text-muted-foreground mt-1">+23%</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}