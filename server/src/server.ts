import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketServer } from "./websocket/socket.server.js";

dotenv.config();

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "SyncPlay server is running",
  });
});

setupSocketServer(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`SyncPlay server running on port ${PORT}`);
});