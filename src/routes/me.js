import { Router } from "express";
import { prisma, h, fmt } from "../lib.js";
import { auth } from "../middleware.js";

const r = Router();
r.get("/me", auth, h(async (req, res) =>
  res.json(await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, nama: true, email: true, avatarUrl: true, role: true } }))));

r.get("/me/favorites", auth, h(async (req, res) => {
  const f = await prisma.favorite.findMany({ where: { userId: req.user.id },
    include: { hotel: { include: { photos: { take: 1, orderBy: { id: "asc" } } } } } });
  res.json(f.map((x) => fmt(x.hotel)));
}));
r.put("/favorites/:hotelId", auth, h(async (req, res) => {
  const k = { userId: req.user.id, hotelId: Number(req.params.hotelId) };
  await prisma.favorite.upsert({ where: { userId_hotelId: k }, update: {}, create: k });
  res.json({ ok: true });
}));
r.delete("/favorites/:hotelId", auth, h(async (req, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.user.id, hotelId: Number(req.params.hotelId) } });
  res.json({ ok: true });
}));
export default r;
