import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

export const prisma = new PrismaClient();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// bungkus handler async agar error diteruskan ke error handler
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const parse = (schema, body) => {
  const r = schema.safeParse(body);
  if (r.success) return r.data;
  throw Object.assign(new Error(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")), { status: 400 });
};

const okType = { "image/jpeg": 1, "image/png": 1, "image/webp": 1 };
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_r, f, cb) => (okType[f.mimetype] ? cb(null, true) : cb(Object.assign(new Error("Hanya JPG, PNG, atau WebP"), { status: 400 }))),
});

export const uploadImage = (buffer) =>
  new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream({ folder: "tuahstay/hotels", resource_type: "image", transformation: [{ width: 1600, crop: "limit" }] },
        (e, r) => (e ? reject(e) : resolve(r)))
      .end(buffer));
export const deleteImage = (publicId) => (publicId ? cloudinary.uploader.destroy(publicId).catch(() => {}) : null);

export const fmt = (x) => ({
  ...x, ratingAvg: Number(x.ratingAvg),
  fasilitas: x.facilities?.map((f) => f.facility), facilities: undefined,
  foto: x.photos?.[0]?.url ?? null,
});
