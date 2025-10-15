import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Mic, Paperclip, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Role = "user" | "assistant"

type UIMessage = {
  id: number
  type: Role
  content: string
  time: string
  isLoading?: boolean
}

type MistralChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

type MistralChatResponse = {
  id: string
  object: string
  model: string
  choices: Array<{
    index: number
    message: { role: "assistant"; content: string }
    finish_reason?: string
  }>
}

/** Light post-formatter: inserts newlines before list-like runs the model sometimes emits inline */
function formatForMarkdown(s: string): string {
  let t = s

  // Newline before numbered lists: "... aspects: 1. Foo 2. Bar" -> lines
  t = t.replace(/(\S)\s+(\d+)\.\s/g, (_m, prev, num) => `${prev}\n\n${num}. `)

  // Newline before dashes that look like bullets
  t = t.replace(/(\S)\s+-\s/g, (_m, prev) => `${prev}\n- `)

  // Ensure links separated from text if they are jammed
  t = t.replace(/\)\s*\*/g, ")\n*")

  return t.trim()
}

const Research = () => {
  const [hasMessages, setHasMessages] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<UIMessage[]>([])

  const model =
    import.meta.env.VITE_MISTRAL_MODEL || "mistral-small-latest"
  const apiUrl =
    import.meta.env.VITE_MISTRAL_PROXY_URL ||
    "https://api.mistral.ai/v1/chat/completions"
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return

    const now = new Date().toISOString().split("T")[0]
    const userMessage: UIMessage = {
      id: Date.now(),
      type: "user",
      content: text,
      time: now,
    }
    const assistantId = Date.now() + 1
    const placeholder: UIMessage = {
      id: assistantId,
      type: "assistant",
      content: "Working on your request...",
      time: now,
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMessage, placeholder])
    setInputValue("")
    setHasMessages(true)

    try {
      const systemPrompt: MistralChatMessage = {
        role: "system",
        content:
          "You are Astral, a concise trading research assistant. Always respond in clean Markdown with headings, bullet lists, short paragraphs, and links as [text](url). Never dump one giant paragraph.",
      }

      const history: MistralChatMessage[] = [
        systemPrompt,
        ...messages
          .filter((m) => !m.isLoading)
          .map<MistralChatMessage>((m) => ({
            role: m.type,
            content: m.content,
          })),
        { role: "user", content: text },
      ]

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: history,
          temperature: 0.3,
          stream: false,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(
          `Mistral error ${res.status}: ${errText || res.statusText}`,
        )
      }

      const json = (await res.json()) as MistralChatResponse
      const reply =
        json?.choices?.[0]?.message?.content?.trim() ||
        "Sorry, I couldn’t generate a reply."

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: reply, isLoading: false }
            : m,
        ),
      )
    } catch (err: any) {
      console.error(err)
      toast.error("Chat request failed. Check API key / network.")
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "There was an error talking to Mistral. Please verify your API key and try again.",
                isLoading: false,
              }
            : m,
        ),
      )
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  // Welcome state - shown when no messages
  if (!hasMessages) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="max-w-2xl w-full text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4 animate-fade-in">
            How can we help you today?
          </h1>
        </div>

        <div
          className="w-full max-w-2xl animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center bg-muted/20 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 p-1 focus-within:from-blue-500/50 focus-within:via-purple-500/50 focus-within:to-blue-500/50 transition-all duration-300">
              <div className="flex items-center bg-background/90 rounded-xl w-full px-3 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Ask anything"
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    disabled={!inputValue.trim()}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
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
    // Make the whole page a fixed, full-viewport flex column so the bottom bar never moves
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Chat Messages (scrolls) */}
      <div
        className="chat-scroll flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full pb-28"
        // pb-28 ensures content doesn't hide behind the fixed input bar
      >
        {messages.map((message) => {
          const isAssistant = message.type === "assistant"
          const content =
            isAssistant && !message.isLoading
              ? formatForMarkdown(message.content)
              : message.content

          return (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {isAssistant && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    A
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex flex-col gap-1">
                {isAssistant ? (
                  <span className="text-sm font-medium text-foreground ml-1">
                    Astral
                  </span>
                ) : (
                  <span className="text-sm font-medium text-foreground mr-1 text-right">
                    You
                  </span>
                )}

                <div
                  className={`max-w-2xl p-4 rounded-2xl ${
                    message.type === "user"
                      ? "bg-muted/50 text-foreground"
                      : "bg-muted/30 text-foreground"
                  }`}
                >
                  {!isAssistant || message.isLoading ? (
                    <>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.isLoading && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-primary rounded-full animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          ></div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      className="text-sm leading-relaxed space-y-2
                        [&>h1]:text-base [&>h1]:font-semibold
                        [&>h2]:text-sm [&>h2]:font-semibold
                        [&>ul]:list-disc [&>ul]:pl-5
                        [&>ol]:list-decimal [&>ol]:pl-5
                        [&>p]:mb-2
                        [&_code]:font-mono [&_code]:text-xs
                        [&_a]:underline"
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            />
                          ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {message.type === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                    U
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed Input Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/90 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }} // iOS safe area
      >
        <div className="max-w-4xl mx-auto w-full p-6">
          <form onSubmit={handleSubmit} className="relative">
            <div className="bg-muted/20 rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 p-1 focus-within:from-blue-500/50 focus-within:via-purple-500/50 focus-within:to-blue-500/50 transition-all duration-300">
              <div className="flex items-center bg-background/90 rounded-xl px-4 py-3">
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Ask follow-up..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim()}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30 ml-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Research
