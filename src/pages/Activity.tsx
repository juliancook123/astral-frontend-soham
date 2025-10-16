import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Activity as ActivityIcon, Filter, Download } from "lucide-react"

const Activity = () => {
  const trades = [
    { id: 1, symbol: "NVDA", type: "BUY", quantity: 10, price: 141.36, total: 1413.60, time: "10:30 AM", date: "2024-01-15", status: "completed", strategy: "Astral Signal" },
    { id: 2, symbol: "AAPL", type: "SELL", quantity: 5, price: 187.44, total: 937.20, time: "2:15 PM", date: "2024-01-15", status: "completed", strategy: "Momentum Pro" },
    { id: 3, symbol: "TSLA", type: "BUY", quantity: 3, price: 267.82, total: 803.46, time: "11:45 AM", date: "2024-01-14", status: "completed", strategy: "Astral Signal" },
    { id: 4, symbol: "GOOGL", type: "BUY", quantity: 7, price: 142.17, total: 995.19, time: "9:30 AM", date: "2024-01-14", status: "pending", strategy: "Conservative Growth" },
  ]

  const orders = [
    { id: 5, symbol: "MSFT", type: "BUY", quantity: 8, price: 338.25, total: 2706.00, time: "Market Open", date: "2024-01-16", status: "pending", strategy: "Momentum Pro" },
    { id: 6, symbol: "NVDA", type: "SELL", quantity: 5, price: 145.00, total: 725.00, time: "Market Open", date: "2024-01-16", status: "pending", strategy: "Astral Signal" },
  ]

  const strategies = [
    { name: "Astral Signal", trades: 12, profit: "+$2,847", status: "active" },
    { name: "Momentum Pro", trades: 8, profit: "+$1,234", status: "active" },
    { name: "Conservative Growth", trades: 3, profit: "+$567", status: "paused" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity</h1>
          <p className="text-muted-foreground mt-1">Track your trades, orders, and strategy performance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="premium">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ActivityIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold text-foreground">156</p>
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
                <p className="text-sm text-muted-foreground">Winning Trades</p>
                <p className="text-2xl font-bold text-success">107</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Losing Trades</p>
                <p className="text-2xl font-bold text-danger">49</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-surface border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ActivityIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold text-foreground">68.6%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tabs */}
      <Tabs defaultValue="trades" className="space-y-6">
        <TabsList className="bg-muted/20">
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="orders">Pending Orders</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <Card className="bg-gradient-surface border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Quantity</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Price</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Total</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Time</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Strategy</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{trade.symbol}</td>
                        <td className="p-4">
                          <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'} className={
                            trade.type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          }>
                            {trade.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-foreground">{trade.quantity}</td>
                        <td className="p-4 text-foreground">${trade.price.toFixed(2)}</td>
                        <td className="p-4 text-foreground">${trade.total.toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">
                          <div>
                            <p>{trade.time}</p>
                            <p className="text-xs">{trade.date}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{trade.strategy}</td>
                        <td className="p-4">
                          <Badge variant={trade.status === 'completed' ? 'default' : 'secondary'}>
                            {trade.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="bg-gradient-surface border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Pending Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Type</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Quantity</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Price</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Total</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Scheduled</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Strategy</th>
                      <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{order.symbol}</td>
                        <td className="p-4">
                          <Badge variant={order.type === 'BUY' ? 'default' : 'secondary'} className={
                            order.type === 'BUY' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          }>
                            {order.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-foreground">{order.quantity}</td>
                        <td className="p-4 text-foreground">${order.price.toFixed(2)}</td>
                        <td className="p-4 text-foreground">${order.total.toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">
                          <div>
                            <p>{order.time}</p>
                            <p className="text-xs">{order.date}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{order.strategy}</td>
                        <td className="p-4">
                          <Button variant="outline" size="sm">
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies">
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <Card key={strategy.name} className="bg-gradient-surface border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{strategy.name}</h3>
                        <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                          {strategy.status}
                        </Badge>
                      </div>
                      <div className="flex gap-6">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Trades</p>
                          <p className="text-xl font-semibold text-foreground">{strategy.trades}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Net Profit</p>
                          <p className="text-xl font-semibold text-success">{strategy.profit}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Activity