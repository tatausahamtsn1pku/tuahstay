import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma, h } from "../lib.js";
import { sign } from "../middleware.js";

const r = Router();
// bisa lebih dari satu Client ID (web, android, ios) dipisah koma
const ids = () => (process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "").split(",").map((x) => x.trim()).filter(Boolean);
const google = new OAuth2Client();
const admins = () => (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const devLogin = () => process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
const pub = (u) => ({ id: u.id, nama: u.nama, email: u.email, avatarUrl: u.avatarUrl, role: u.role });

r.get("/config", (_q, res) => res.json({ googleClientId: ids()[0], devLogin: devLogin() }));

r.post("/google", h(async (req, res) => {
  const ticket = await google.verifyIdToken({ idToken: req.body?.credential, audience: ids() })
    .catch(() => null);
  const p = ticket?.getPayload();
  if (!p) return res.status(401).json({ message: "Token Google tidak valid" });
  if (!p.email_verified) return res.status(401).json({ message: "Email Google belum terverifikasi" });
  const email = p.email.toLowerCase(), isAdmin = admins().includes(email);
  const user = await prisma.user.upsert({
    where: { email },
    update: { googleId: p.sub, avatarUrl: p.picture, ...(isAdmin && { role: "admin" }) },
    create: { nama: p.name || email.split("@")[0], email, googleId: p.sub, avatarUrl: p.picture, role: isAdmin ? "admin" : "user" },
  });
  res.json({ token: sign(user), user: pub(user) });
}));

r.post("/dev", h(async (_q, res) => {
  const email = admins()[0];
  if (!devLogin() || !email) return res.status(404).json({ message: "Tidak tersedia" });
  const user = await prisma.user.upsert({ where: { email }, update: { role: "admin" }, create: { nama: "Admin Lokal", email, role: "admin" } });
  res.json({ token: sign(user), user: pub(user) });
}));

export default r;
