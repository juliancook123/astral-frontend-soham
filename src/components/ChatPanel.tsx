import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Mic, Paperclip, Plus } from "lucide-react"
import { useState } from "react"

interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  time: string;
  isLoading?: boolean;
}

interface ChatPanelProps {
  className?: string;
}

const ChatPanel = ({ className = "" }: ChatPanelProps) => {
  const [hasMessages, setHasMessages] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      // Add user message
      const userMessage: Message = {
        id: Date.now(),
        type: "user",
        content: inputValue.trim(),
        time: new Date().toISOString().split('T')[0]
      }
      
      // Add loading assistant response
      const assistantMessage: Message = {
        id: Date.now() + 1,
        type: "assistant",
        content: "Working on your request...",
        time: new Date().toISOString().split('T')[0],
        isLoading: true
      }
      
      setMessages(prev => [...prev, userMessage, assistantMessage])
      setInputValue("")
      setHasMessages(true)
      
      // Here you would typically make the API call
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  // Welcome state - shown when no messages
  if (!hasMessages) {
    return (
      <div className={`h-full flex flex-col items-center justify-center bg-background px-6 ${className}`}>
        <div className="max-w-md w-full text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4 animate-fade-in">
            How can we help you today?
          </h2>
          <p className="text-sm text-muted-foreground animate-fade-in" style={{animationDelay: '0.1s'}}>
            Ask about strategy optimization, backtesting, or trading insights
          </p>
        </div>
        
        <div className="w-full max-w-md animate-fade-in" style={{animationDelay: '0.2s'}}>
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-muted/20 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 p-1 focus-within:from-blue-500/50 focus-within:via-purple-500/50 focus-within:to-blue-500/50 transition-all duration-300">
              <div className="flex items-center bg-background/90 rounded-xl w-full px-3 py-3">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Ask anything"
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button type="submit" disabled={!inputValue.trim()} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Chat state - shown when messages exist
  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'assistant' && (
              <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  A
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex flex-col gap-1">
              {message.type === 'assistant' && (
                <span className="text-xs font-medium text-foreground ml-1">Astral</span>
              )}
              {message.type === 'user' && (
                <span className="text-xs font-medium text-foreground mr-1 text-right">You</span>
              )}
              
              <div
                className={`max-w-xs p-3 rounded-xl text-sm ${
                  message.type === 'user'
                    ? 'bg-muted/50 text-foreground'
                    : 'bg-muted/30 text-foreground'
                }`}
              >
                <p className="text-xs leading-relaxed">{message.content}</p>
                {message.isLoading && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                )}
              </div>
            </div>
            
            {message.type === 'user' && (
              <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                  U
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>
      
      {/* Input Area */}
      <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-muted/20 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 p-1 focus-within:from-blue-500/50 focus-within:via-purple-500/50 focus-within:to-blue-500/50 transition-all duration-300">
            <div className="flex items-center bg-background/90 rounded-xl px-3 py-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Ask follow-up..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-sm"
              />
              <Button type="submit" disabled={!inputValue.trim()} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30 ml-2">
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatPanel