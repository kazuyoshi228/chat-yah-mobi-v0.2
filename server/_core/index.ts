import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleOAuthRoutes } from "./googleOAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { webhookRouter } from "../routers/webhooks";
import { systemHealthRouter } from "../routers/systemHealth";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setIo } from "../socket";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { purgeExpiredSessions } from "../db";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Security headers via Helmet.js
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com"],
        frameAncestors: ["*"],  // Allow widget embedding
      },
    },
    crossOriginEmbedderPolicy: false,  // Allow cross-origin resources
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Configure body parser — 20 MB covers screenshot uploads (base64 overhead included)
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Socket.io setup
  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ── Redis Pub/Sub adapter (Upstash) ──────────────────────────────────────
  // Enables real-time message broadcasting across multiple server instances.
  // Falls back gracefully to in-memory if credentials are not configured.
  if (ENV.upstashRedisRestUrl && ENV.upstashRedisRestToken) {
    try {
      // Upstash Redis uses TLS; construct rediss:// URL from REST URL
      const redisHost = ENV.upstashRedisRestUrl.replace(/^https?:\/\//, "");
      const redisUrl = `rediss://default:${ENV.upstashRedisRestToken}@${redisHost}:6379`;
      const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket.io] Redis Pub/Sub adapter connected (Upstash)");
    } catch (err) {
      console.warn("[Socket.io] Redis adapter failed, using in-memory adapter:", err);
    }
  } else {
    console.log("[Socket.io] Using in-memory adapter (no Redis credentials)");
  }

  setIo(io);

  // ── Socket.io authentication helper ─────────────────────────────────────
  // Returns the full DB user (with role) or null if unauthenticated
  async function resolveSocketUser(socket: import("socket.io").Socket) {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookieMap = new Map(
        cookieHeader.split(";").map((c) => {
          const [k, ...v] = c.trim().split("=");
          return [k.trim(), decodeURIComponent(v.join("="))];
        })
      );
      const sessionCookie = cookieMap.get(COOKIE_NAME);
      const session = await sdk.verifySession(sessionCookie);
      if (!session) return null;
      // Fetch full user record from DB to get role
      const { getUserByOpenId } = await import("../db");
      return await getUserByOpenId(session.openId); // { id, role, ... } | undefined
    } catch {
      return null;
    }
  }

  // Socket.io connection handling
  io.on("connection", (socket) => {
    // Join operator room — requires a valid operator/admin session cookie
    socket.on("join_operators", async () => {
      const session = await resolveSocketUser(socket);
      if (!session) {
        socket.emit("auth_error", { message: "Authentication required to join operator room." });
        return;
      }
      // Only operators and admins may join the operator room
      if (session.role !== "operator" && session.role !== "admin") {
        socket.emit("auth_error", { message: "Operator or admin role required." });
        return;
      }
      socket.join("operators");
    });

    // Join specific session room
    socket.on("join_session", (sessionId: number) => {
      socket.join(`session:${sessionId}`);
    });

    // Leave session room
    socket.on("leave_session", (sessionId: number) => {
      socket.leave(`session:${sessionId}`);
    });

    // Visitor typing indicator
    socket.on("visitor_typing", (data: { sessionId: number; isTyping: boolean }) => {
      socket.to(`session:${data.sessionId}`).emit("typing", {
        role: "visitor",
        isTyping: data.isTyping,
      });
    });

    socket.on("disconnect", () => {
      // cleanup handled automatically by socket.io
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleOAuthRoutes(app);

  // Webhook endpoints for yah.mobi/app integration
  app.use("/api/webhooks", webhookRouter);

  // System health monitoring endpoints
  app.use("/api", systemHealthRouter);

  // Allow /widget-chat to be embedded in iframes on external sites
  app.use("/widget-chat", (_req, res, next) => {
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    next();
  });

  // Serve widget.js with proper CORS headers BEFORE Vite/SPA middleware
  app.get("/widget.js", (_req, res) => {
    const widgetPath = path.resolve(
      process.cwd(),
      "client",
      "public",
      "widget.js"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.sendFile(widgetPath);
  });

  app.options("/widget.js", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).end();
  });

  // Heartbeat: data retention purge (nightly)
  app.post("/api/scheduled/data-retention", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const purged = await purgeExpiredSessions();
      res.json({ ok: true, purged });
    } catch (err: any) {
      console.error("[DataRetention] Error:", err);
      res.status(500).json({ error: err?.message ?? "unknown", timestamp: new Date().toISOString() });
    }
  });

  // Heartbeat: weekly RAG embedding check & auto-regeneration
  app.post("/api/scheduled/check-rag-embeddings", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });

      const { listRagDocuments, updateRagDocument } = await import("../db");
      const { getEmbedding } = await import("../routers/ai");

      const docs = await listRagDocuments();
      const nullEmbeddingDocs = docs.filter(
        (d) => !d.embedding || (Array.isArray(d.embedding) && (d.embedding as number[]).length === 0)
      );

      let regenerated = 0;
      let failed = 0;

      for (const doc of nullEmbeddingDocs) {
        try {
          const embedding = await getEmbedding(`${doc.title}\n${doc.content}`);
          if (embedding.length > 0) {
            await updateRagDocument(doc.id, { embedding } as any);
            regenerated++;
            console.log(`[RAG-Heartbeat] Regenerated embedding for doc ${doc.id}: ${doc.title}`);
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`[RAG-Heartbeat] Failed to regenerate embedding for doc ${doc.id}:`, e);
          failed++;
        }
      }

      const result = {
        ok: true,
        totalDocs: docs.length,
        nullEmbeddings: nullEmbeddingDocs.length,
        regenerated,
        failed,
        timestamp: new Date().toISOString(),
      };
      console.log("[RAG-Heartbeat] Check complete:", result);
      res.json(result);
    } catch (err: any) {
      console.error("[RAG-Heartbeat] Error:", err);
      res.status(500).json({ error: err?.message ?? "unknown", timestamp: new Date().toISOString() });
    }
  });

  // Heartbeat: OMAX eSIM provisioning monitor & auto-refund (every 15 min)
  app.post("/api/scheduled/esim-monitor", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { esimMonitorHandler } = await import("../refundJob");
      return esimMonitorHandler(req, res);
    } catch (err: any) {
      console.error("[eSIM-Monitor] Error:", err);
      res.status(500).json({ error: err?.message ?? "unknown", timestamp: new Date().toISOString() });
    }
  });

  // Heartbeat: System health check (every 5 min)
  app.post("/api/scheduled/health-check", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) return res.status(403).json({ error: "cron-only" });
      const { runHealthCheckJob } = await import("../healthCheckJob");
      await runHealthCheckJob();
      return res.json({ ok: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("[HealthCheck] Error:", err);
      res.status(500).json({ error: err?.message ?? "unknown", timestamp: new Date().toISOString() });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
