import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { runStrategyAgentRequest } from "./server/strategyAgent";

const strategyAgentProxy = (apiKey?: string) => ({
  name: "strategy-agent-proxy",
  apply: "serve",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use("/api/strategy-agent", (req, res, next) => {
      const effectiveKey = apiKey || process.env.OPENAI_API_KEY;

      res.setHeader("Content-Type", "application/json");

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Allow", "POST");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      if (!effectiveKey) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "OPENAI_API_KEY is not configured on the server." }));
        return;
      }

      let rawBody = "";
      req.on("data", (chunk) => {
        rawBody += chunk;
      });

      req.on("end", async () => {
        let message = "";
        try {
          const parsed = rawBody ? JSON.parse(rawBody) : {};
          if (typeof parsed?.message === "string") {
            message = parsed.message.trim();
          }
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid JSON body" }));
          return;
        }

        if (!message) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "message is required" }));
          return;
        }

        try {
          const { status, body } = await runStrategyAgentRequest(message, effectiveKey);
          res.statusCode = status;
          res.end(JSON.stringify(body));
        } catch (error) {
          console.error("[vite] strategy-agent-proxy error", error);
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: "Failed to run strategy agent.",
              details: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && strategyAgentProxy(env.OPENAI_API_KEY),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
