import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer } from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const app = Fastify({ logger: false });

// Serve static files
await app.register(fastifyStatic, {
  root: join(__dirname, "../static"),
  prefix: "/",
});

// Serve Scramjet assets from node_modules
await app.register(fastifyStatic, {
  root: join(__dirname, "../node_modules/@mercuryworkshop/scramjet/dist"),
  prefix: "/scramjet/",
  decorateReply: false,
});

// Serve bare-mux assets
await app.register(fastifyStatic, {
  root: join(__dirname, "../node_modules/@mercuryworkshop/bare-mux/dist"),
  prefix: "/baremux/",
  decorateReply: false,
});

// Serve libcurl-transport assets
await app.register(fastifyStatic, {
  root: join(__dirname, "../node_modules/@mercuryworkshop/libcurl-transport/dist"),
  prefix: "/libcurl/",
  decorateReply: false,
});

// SPA fallback — always return index.html
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile("index.html");
});

await app.ready();

const httpServer = createServer((req, res) => {
  app.routing(req, res);
});

// WebSocket server for Wisp transport
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws) => {
  ws.on("error", () => ws.terminate());
});

httpServer.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/wisp/")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ░█▀█░█▀▄░█▀▄░▀█▀░▀█▀
  ░█░█░█▀▄░█▀▄░░█░░░█░
  ░▀▀▀░▀░▀░▀▀░░▀▀▀░░▀░

  🌑 Orbit v2 running on http://localhost:${PORT}
  ⚡ Engine: Scramjet (Wisp transport)
  `);
});
