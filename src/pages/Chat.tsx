import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Mic, Paperclip, Zap } from "lucide-react";
import { useWebSocket } from "@/context/WebSocketProvider";
import { useSubscription } from "@/hooks/useSubscription";

type ChatMsg = { id: number; type: "user" | "assistant"; content: string; time: string; status?: string };

const initialMessages: ChatMsg[] = [
  {
    id: 1,
    type: "assistant",
    content: "Hello! Welcome to Astral Trading! How can I help you today?",
    time: new Date().toISOString(),
  },
  {
    id: 2,
    type: "user",
    content:
      "How can I assist you today? Are you looking for help with trend graphing, analyzing ticker data, or something else?",
    time: new Date().toISOString(),
  },
  {
    id: 3,
    type: "assistant",
    content: "Plot a Heikin Ashi chart for Oracle for the last 3 weeks",
    time: new Date().toISOString(),
    status: "delivered",
  },
  {
    id: 4,
    type: "assistant",
    content:
      "Setting up a Heikin Ashi chart for Oracle (ORCL) for the last 3 weeks.",
    time: new Date().toISOString(),
  },
];

const Chat = () => {
  const { client, status } = useWebSocket();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const nextId = useRef<number>(initialMessages.length + 1);

  // Subscribe to assistant messages from the server
  useSubscription(["chat.message", "chat.reply"], (msg) => {
    const text = typeof msg.payload === "string" ? msg.payload : msg.payload?.text ?? "";
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, type: "assistant", content: text, time: new Date().toISOString() },
    ]);
  });

  const presence = useMemo(() => {
    if (status === "open") return { label: "Online", dot: "bg-success" } as const;
    if (status === "connecting") return { label: "Connecting", dot: "bg-warning" } as const;
    return { label: "Offline", dot: "bg-danger" } as const;
  }, [status]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    // optimistic append
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, type: "user", content: text, time: new Date().toISOString(), status: status === "open" ? "sent" : "queued" },
    ]);
    setInput("");
    try {
      client.send("chat.send", { text }, { expectReply: false });
    } catch (e) {
      // surface send error minimally by appending a system-ish message
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, type: "assistant", content: "Failed to send message.", time: new Date().toISOString() },
      ]);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Astral Trading Assistant</h1>
          <p className="text-muted-foreground mt-1">Get intelligent insights and analysis for your trading decisions</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 bg-gradient-surface border-border flex flex-col">
            <CardHeader className="border-b border-border/50 flex-shrink-0">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span>Astral Trading Assistant</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 ${presence.dot} rounded-full animate-pulse`}></div>
                    <span className={`text-xs font-medium ${presence.label === 'Online' ? 'text-success' : presence.label === 'Connecting' ? 'text-warning' : 'text-danger'}`}>
                      {presence.label}
                    </span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          A
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted/30'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.status && (
                        <p className="text-xs opacity-60 mt-1">{message.status}</p>
                      )}
                    </div>
                    
                    {message.type === 'user' && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Input Area */}
              <div className="border-t border-border/50 p-4">
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder={status === 'open' ? "Type your message..." : "Connecting..."}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="pr-20 bg-background/50"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mic className="w-4 h-4" />
                      </Button>
                      <Button variant="premium" size="icon" className="h-8 w-8" onClick={sendMessage} disabled={!input.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with suggestions */}
        <div className="w-80 space-y-4">
          <Card className="bg-gradient-surface border-border">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-left">
                📊 Analyze current portfolio
              </Button>
              <Button variant="outline" className="w-full justify-start text-left">
                📈 Show market trends
              </Button>
              <Button variant="outline" className="w-full justify-start text-left">
                🎯 Generate trade signals
              </Button>
              <Button variant="outline" className="w-full justify-start text-left">
                📰 Latest market news
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-surface border-border">
            <CardHeader>
              <CardTitle className="text-lg">Recent Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-sm font-medium text-foreground">NVDA Technical Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">Strong bullish momentum detected</p>
                <p className="text-xs text-primary mt-1">2 hours ago</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-sm font-medium text-foreground">Portfolio Risk Assessment</p>
                <p className="text-xs text-muted-foreground mt-1">Moderate risk, well diversified</p>
                <p className="text-xs text-primary mt-1">5 hours ago</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Chat
