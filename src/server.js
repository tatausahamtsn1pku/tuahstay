import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import hotelRoutes from "./routes/hotels.js";
import meRoutes from "./routes/me.js";
import adminRoutes from "./routes/admin.js";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(","), exposedHeaders: ["X-Total-Count"] }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_q, res) => res.json({ name: "TuahStay API", status: "ok" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }), authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api", meRoutes, adminRoutes);
app.use((_q, res) => res.status(404).json({ message: "Endpoint tidak ditemukan" }));

app.use((err, _req, res, _next) => {
  const prismaMap = { P2025: [404, "Data tidak ditemukan"], P2002: [409, "Data sudah ada"], P2003: [404, "Data terkait tidak ditemukan"] };
  let [status, message] = [err.status || 500, err.status ? err.message : "Terjadi kesalahan pada server"];
  if (err.name === "MulterError") [status, message] = [400, err.message];
  if (prismaMap[err.code]) [status, message] = prismaMap[err.code];
  if (status === 500) console.error(err);
  res.status(status).json({ message });
});

app.listen(process.env.PORT || 3000, () => console.log("TuahStay API di http://localhost:" + (process.env.PORT || 3000)));
