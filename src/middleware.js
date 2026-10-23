import jwt from "jsonwebtoken";
import { prisma } from "./lib.js";

export const sign = (u) => jwt.sign({ sub: u.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// peran dibaca dari database, jadi perubahan peran langsung berlaku
export const auth = async (req, res, next) => {
  try {
    const t = (req.headers.authorization || "").replace("Bearer ", "");
    const p = jwt.verify(t, process.env.JWT_SECRET);
    const u = await prisma.user.findUnique({ where: { id: p.sub }, select: { id: true, role: true } });
    if (!u) throw new Error("no user");
    req.user = u;
    next();
  } catch { res.status(401).json({ message: "Belum login atau token tidak valid" }); }
};
export const adminOnly = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ message: "Khusus admin" });
