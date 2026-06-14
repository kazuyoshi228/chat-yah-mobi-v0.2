import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { Server as SocketIOServer } from "socket.io";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setIo } from "../socket";
import { sdk } from "./sdk";
import { purgeExpiredSessions } from "../db";

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

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Socket.io setup
  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  setIo(io);

  // Socket.io connection handling
  io.on("connection", (socket) => {
    // Join operator room
    socket.on("join_operators", () => {
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
