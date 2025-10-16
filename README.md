# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/26701a27-d4ed-42b0-bc2a-8ab4aa3e17cc

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/26701a27-d4ed-42b0-bc2a-8ab4aa3e17cc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## WebSocket Integration

- A single, shared WebSocket client is provided at `src/lib/wsClient.ts` and exposed to React via `WebSocketProvider` (`src/context/WebSocketProvider.tsx`).
- Configure the server URL with `VITE_WS_URL` (e.g., `wss://api.example.com/ws`). If unset, it falls back to `ws(s)://<host>/ws`.
- Use in components:
  - Wrap the app (already done in `src/App.tsx`).
  - Access the client with `useWebSocket()` and subscribe with `useSubscription(type, handler)` from `src/hooks/useSubscription.ts`.
  - Example usage is wired in `src/pages/Chat.tsx` (`chat.send` → outgoing, `chat.message`/`chat.reply` → incoming).

Envelope format

- Outgoing: `{ v: 1, type: "chat.send", requestId, payload: { text } }`
- Incoming: `{ v: 1, type: "chat.message" | "chat.reply", payload }`

Behavior

- Auto-reconnect with backoff and jitter.
- Heartbeat pings at intervals; reconnects when idle.
- Buffers outbound messages until the socket is open.

## Strategy Agent

- Agent execution now lives in `api/strategy-agent.ts` (serverless-ready for Vercel). It uses the OpenAI Agents SDK with a single tool that prepares the websocket `start_stream` payload.
- The frontend calls this endpoint through `useStrategyAgent()` (`src/agents/strategy/useStrategyAgent.ts`), then forwards the returned payload(s) to the shared websocket client.
- Provide `OPENAI_API_KEY` to the serverless environment (never expose it via `VITE_` on the client). During local development the Vite dev server proxies `/api/strategy-agent`, so setting `OPENAI_API_KEY` and running `npm run dev` is sufficient. For deployment on Vercel the same handler lives under `api/strategy-agent.ts`.
- The Strategy page now renders a live TradingView (lightweight-charts) candlestick chart that updates as websocket frames arrive (`start_stream_ack`, `partial_bar`, `bar_close`). Incoming frames are logged as `[ws][inbound]` in development to simplify debugging.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/26701a27-d4ed-42b0-bc2a-8ab4aa3e17cc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
