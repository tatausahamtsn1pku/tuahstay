import { Router } from "express";
import { z } from "zod";
import { prisma, h, parse, deleteImage } from "../lib.js";
import { auth, adminOnly } from "../middleware.js";

const r = Router();
const fSchema = z.object({ nama: z.string().trim().min(2).max(50) });

r.get("/facilities", h(async (_q, res) => res.json(await prisma.facility.findMany({ orderBy: { nama: "asc" } }))));

r.use(["/admin", "/photos"], auth, adminOnly);

r.post("/admin/facilities", h(async (req, res) => res.status(201).json(await prisma.facility.create({ data: parse(fSchema, req.body) }))));
r.patch("/admin/facilities/:id", h(async (req, res) =>
  res.json(await prisma.facility.update({ where: { id: Number(req.params.id) }, data: parse(fSchema, req.body) }))));
r.delete("/admin/facilities/:id", h(async (req, res) => {
  await prisma.facility.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}));

r.delete("/photos/:id", h(async (req, res) => {
  const p = await prisma.hotelPhoto.findUnique({ where: { id: Number(req.params.id) } });
  if (!p) return res.status(404).json({ message: "Foto tidak ditemukan" });
  await prisma.hotelPhoto.delete({ where: { id: p.id } });
  await deleteImage(p.publicId);
  res.json({ ok: true });
}));

r.get("/admin/users", h(async (_q, res) =>
  res.json(await prisma.user.findMany({ select: { id: true, nama: true, email: true, role: true, createdAt: true }, orderBy: { id: "desc" }, take: 200 }))));
r.patch("/admin/users/:id/role", h(async (req, res) => {
  const { role } = parse(z.object({ role: z.enum(["user", "admin"]) }), req.body), uid = Number(req.params.id);
  if (uid === req.user.id) return res.status(400).json({ message: "Tidak bisa mengubah peran sendiri" });
  res.json(await prisma.user.update({ where: { id: uid }, data: { role }, select: { id: true, nama: true, email: true, role: true } }));
}));

r.get("/admin/stats", h(async (_q, res) => {
  const [totalHotel, totalUser, totalReview, avg, perKec, top] = await Promise.all([
    prisma.hotel.count(), prisma.user.count(), prisma.review.count(),
    prisma.hotel.aggregate({ _avg: { hargaMin: true } }),
    prisma.hotel.groupBy({ by: ["kecamatan"], _count: { _all: true }, orderBy: { _count: { kecamatan: "desc" } } }),
    prisma.hotel.findMany({ orderBy: { ratingAvg: "desc" }, take: 5, select: { id: true, nama: true, ratingAvg: true } }),
  ]);
  res.json({
    totalHotel, totalUser, totalReview, rataHargaMin: Math.round(avg._avg.hargaMin || 0),
    perKecamatan: perKec.map((x) => ({ kecamatan: x.kecamatan || "(kosong)", jumlah: x._count._all })),
    teratas: top.map((t) => ({ ...t, ratingAvg: Number(t.ratingAvg) })),
  });
}));
export default r;
