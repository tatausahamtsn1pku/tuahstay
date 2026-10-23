import { Router } from "express";
import { z } from "zod";
import { prisma, h, parse, upload, uploadImage, deleteImage, fmt } from "../lib.js";
import { auth, adminOnly } from "../middleware.js";

const r = Router();
const shape = {
  nama: z.string().trim().min(2).max(150),
  alamat: z.string().max(300).nullish(), kecamatan: z.string().max(60).nullish(),
  bintang: z.number().int().min(0).max(5),
  hargaMin: z.number().int().min(0).nullish(), hargaMax: z.number().int().min(0).nullish(),
  telepon: z.string().max(30).nullish(),
  website: z.string().max(300).regex(/^https?:\/\/\S+$/i, "website harus diawali http:// atau https://").nullish(),
  deskripsi: z.string().max(2000).nullish(),
  lat: z.number().min(0.3).max(0.7, "lat di luar Pekanbaru"), lng: z.number().min(101.2).max(101.7, "lng di luar Pekanbaru"),
  fasilitas: z.array(z.number().int()).max(30).optional(),
};
const createSchema = z.object({ ...shape, bintang: shape.bintang.default(0) });
const updateSchema = z.object(shape).partial();
const rel = (ids, upd) => ids && { facilities: { ...(upd && { deleteMany: {} }), create: ids.map((facilityId) => ({ facilityId })) } };
const inc = { photos: { orderBy: { id: "asc" } }, facilities: { include: { facility: true } } };
const id = (req) => Number(req.params.id);

// daftar + filter + urutan + halaman (total di header X-Total-Count)
r.get("/", h(async (req, res) => {
  const { q, kecamatan, bintangMin, hargaMax, fasilitas, sort } = req.query;
  const limit = Math.min(Number(req.query.limit) || 200, 200), page = Math.max(Number(req.query.page) || 1, 1);
  const need = String(fasilitas || "").split(",").filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const where = {
    ...(q && { nama: { contains: String(q), mode: "insensitive" } }),
    ...(kecamatan && { kecamatan: String(kecamatan) }),
    ...(bintangMin && { bintang: { gte: Number(bintangMin) } }),
    ...(hargaMax && { hargaMin: { lte: Number(hargaMax) } }),
    ...(need.length && { AND: need.map((fid) => ({ facilities: { some: { facilityId: fid } } })) }),
  };
  const orderBy = { rating: { ratingAvg: "desc" }, harga: { hargaMin: "asc" } }[sort] || { nama: "asc" };
  const [total, rows] = await Promise.all([
    prisma.hotel.count({ where }),
    prisma.hotel.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit,
      include: { photos: { take: 1, orderBy: { id: "asc" } }, facilities: { include: { facility: true } } } }),
  ]);
  res.set("X-Total-Count", String(total)).json(rows.map(fmt));
}));

// hotel di sekitar titik, diurutkan dengan skor relevansi (jarak 40%, rating 30%, budget 20%, bintang 10%)
r.get("/nearby", h(async (req, res) => {
  const lat = Number(req.query.lat), lng = Number(req.query.lng);
  const radius = Math.min(Number(req.query.radius) || 2000, 20000);
  const budget = req.query.budget ? Number(req.query.budget) : null;
  if ([lat, lng].some(Number.isNaN)) return res.status(400).json({ message: "lat dan lng harus angka" });
  res.json(await prisma.$queryRaw`
    SELECT hotels.id, nama, alamat, kecamatan, bintang, harga_min AS "hargaMin", harga_max AS "hargaMax", website, telepon,
           rating_avg::float AS "ratingAvg", lat, lng,
           (SELECT url FROM hotel_photos p WHERE p.hotel_id = hotels.id ORDER BY p.id LIMIT 1) AS foto,
           d.jarak AS "jarakM",
           (0.4 * (1 - LEAST(d.jarak / ${radius}::float8, 1)) + 0.3 * (rating_avg::float / 5)
            + 0.2 * (CASE WHEN ${budget}::int IS NULL OR harga_min <= ${budget}::int THEN 1 ELSE 0 END)
            + 0.1 * (bintang::float / 5)) AS skor
    FROM hotels,
         LATERAL (SELECT ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) AS jarak) d
    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography, ${radius}::float8)
    ORDER BY skor DESC LIMIT 50`);
}));

r.get("/:id", h(async (req, res) => {
  const x = await prisma.hotel.findUnique({ where: { id: id(req) }, include: { ...inc,
    reviews: { take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { nama: true, avatarUrl: true } } } } } });
  x ? res.json(fmt(x)) : res.status(404).json({ message: "Hotel tidak ditemukan" });
}));

r.post("/", auth, adminOnly, h(async (req, res) => {
  const { fasilitas, ...d } = parse(createSchema, req.body);
  res.status(201).json(fmt(await prisma.hotel.create({ data: { ...d, ...rel(fasilitas) }, include: inc })));
}));

r.patch("/:id", auth, adminOnly, h(async (req, res) => {
  const { fasilitas, ...d } = parse(updateSchema, req.body);
  res.json(fmt(await prisma.hotel.update({ where: { id: id(req) }, data: { ...d, ...rel(fasilitas, true) }, include: inc })));
}));

r.delete("/:id", auth, adminOnly, h(async (req, res) => {
  const photos = await prisma.hotelPhoto.findMany({ where: { hotelId: id(req) } });
  await prisma.hotel.delete({ where: { id: id(req) } });
  await Promise.all(photos.map((p) => deleteImage(p.publicId)));
  res.json({ ok: true });
}));

// foto -> Cloudinary
r.post("/:id/photos", auth, adminOnly, upload.array("foto", 5), h(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: "Pilih foto dulu" });
  if (!(await prisma.hotel.findUnique({ where: { id: id(req) } }))) return res.status(404).json({ message: "Hotel tidak ditemukan" });
  const up = await Promise.all(req.files.map((f) => uploadImage(f.buffer)));
  await prisma.hotelPhoto.createMany({ data: up.map((u) => ({ hotelId: id(req), url: u.secure_url, publicId: u.public_id })) });
  res.status(201).json({ ok: true, jumlah: up.length });
}));

// ulasan: satu pengguna satu ulasan per hotel (kirim ulang = ubah)
const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), komentar: z.string().max(1000).nullish() });
const recalc = async (hotelId) => {
  const a = await prisma.review.aggregate({ where: { hotelId }, _avg: { rating: true } });
  await prisma.hotel.update({ where: { id: hotelId }, data: { ratingAvg: Math.round((a._avg.rating || 0) * 10) / 10 } });
};
r.post("/:id/reviews", auth, h(async (req, res) => {
  const d = parse(reviewSchema, req.body), hotelId = id(req), userId = req.user.id;
  const rv = await prisma.review.upsert({ where: { userId_hotelId: { userId, hotelId } }, update: d, create: { ...d, userId, hotelId } });
  await recalc(hotelId);
  res.status(201).json(rv);
}));
r.delete("/:id/reviews/:rid", auth, h(async (req, res) => {
  const rv = await prisma.review.findUnique({ where: { id: Number(req.params.rid) } });
  if (!rv || rv.hotelId !== id(req)) return res.status(404).json({ message: "Ulasan tidak ditemukan" });
  if (rv.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Bukan ulasanmu" });
  await prisma.review.delete({ where: { id: rv.id } });
  await recalc(rv.hotelId);
  res.json({ ok: true });
}));

export default r;
