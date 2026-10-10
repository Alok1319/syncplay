import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketServer } from "./websocket/socket.server.js";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20kb" }));
app.use("/api/auth", authRoutes);

const io = new Server(httpServer, {
  cors: corsOptions,
});

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
