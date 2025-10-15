import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Shield, Bell, Palette, Database, Key } from "lucide-react"

const Settings = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/20">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">Change Avatar</Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="Astral Trader" className="bg-background/50" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="trader@astral.com" className="bg-background/50" />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">EST</SelectItem>
                        <SelectItem value="pst">PST</SelectItem>
                        <SelectItem value="cet">CET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button variant="premium" className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">Premium Account</h3>
                      <p className="text-sm text-muted-foreground">Full access to all features</p>
                    </div>
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className="text-foreground font-medium">Premium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="text-foreground font-medium">January 2024</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trades</span>
                    <span className="text-foreground font-medium">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="text-success font-medium">68.6%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trading">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Trading Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="risk-level">Risk Level</Label>
                  <Select defaultValue="moderate">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="position-size">Default Position Size (%)</Label>
                  <Input id="position-size" type="number" defaultValue="5" className="bg-background/50" />
                </div>

                <div>
                  <Label htmlFor="stop-loss">Default Stop Loss (%)</Label>
                  <Input id="stop-loss" type="number" defaultValue="2" className="bg-background/50" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-execute">Auto-execute trades</Label>
                    <Switch id="auto-execute" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="paper-trading">Paper trading mode</Label>
                    <Switch id="paper-trading" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fractional-shares">Allow fractional shares</Label>
                    <Switch id="fractional-shares" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Market Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="data-provider">Data Provider</Label>
                  <Select defaultValue="yahoo">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yahoo">Yahoo Finance</SelectItem>
                      <SelectItem value="alpha">Alpha Vantage</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="iex">IEX Cloud</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="update-frequency">Update Frequency</Label>
                  <Select defaultValue="real-time">
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real-time">Real-time</SelectItem>
                      <SelectItem value="1min">1 minute</SelectItem>
                      <SelectItem value="5min">5 minutes</SelectItem>
                      <SelectItem value="15min">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Configure API Keys
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-gradient-surface border-border">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Trading Alerts</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="trade-executed">Trade Executed</Label>
                      <p className="text-sm text-muted-foreground">Notify when trades are executed</p>
                    </div>
                    <Switch id="trade-executed" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="price-alerts">Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify on significant price movements</p>
                    </div>
                    <Switch id="price-alerts" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="strategy-signals">Strategy Signals</Label>
                      <p className="text-sm text-muted-foreground">New buy/sell signals from strategies</p>
                    </div>
                    <Switch id="strategy-signals" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Market Updates</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="market-open">Market Open/Close</Label>
                      <p className="text-sm text-muted-foreground">Daily market session notifications</p>
                    </div>
                    <Switch id="market-open" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="earnings-reports">Earnings Reports</Label>
                      <p className="text-sm text-muted-foreground">Upcoming earnings for your holdings</p>
                    </div>
                    <Switch id="earnings-reports" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="market-news">Market News</Label>
                      <p className="text-sm text-muted-foreground">Important market news and events</p>
                    </div>
                    <Switch id="market-news" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" className="bg-background/50" />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" className="bg-background/50" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" className="bg-background/50" />
                </div>
                <Button variant="premium" className="w-full">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-surface border-border">
              <CardHeader>
                <CardTitle>Security Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch id="two-factor" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="session-timeout">Auto Logout</Label>
                    <p className="text-sm text-muted-foreground">Logout after inactivity</p>
                  </div>
                  <Switch id="session-timeout" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="login-alerts">Login Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify on new device logins</p>
                  </div>
                  <Switch id="login-alerts" defaultChecked />
                </div>

                <Button variant="outline" className="w-full">
                  View Login History
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Settings