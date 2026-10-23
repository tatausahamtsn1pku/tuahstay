# TuahStay Backend (API)

Stack: Express, Prisma (PostgreSQL + PostGIS), Cloudinary, Google OAuth, JWT.

Setup:
1. `npm install`
2. salin `.env.example` ke `.env`, lalu isi
3. database baru: `npx prisma migrate dev --name init --create-only`, tempel isi `prisma/postgis_extra.sql`
   di baris paling bawah `migration.sql`, lalu `npx prisma migrate dev`
   (database lama: salin folder `prisma/migrations` lama ke sini, lalu `npx prisma migrate dev`)
4. `npm run dev` (http://localhost:3000)

Untuk aplikasi mobile (Expo): ambil ID token Google di aplikasi, kirim ke POST /api/auth/google
dengan body {"credential": "<id_token>"}. Daftarkan Client ID web/android/ios di GOOGLE_CLIENT_IDS.
Alamat API dari emulator Android: http://10.0.2.2:3000. Dari HP asli: http://<IP-laptop>:3000. Produksi wajib https.

Login: kirim ID token Google ke POST /api/auth/google, balasannya JWT. Pakai header `Authorization: Bearer <token>`.
Email di ADMIN_EMAILS otomatis jadi admin. DEV_LOGIN=true hanya untuk lokal.

| Method | Endpoint | Akses |
|---|---|---|
| GET | /api/auth/config | publik |
| POST | /api/auth/google, /api/auth/dev | publik |
| GET | /api/me, /api/me/favorites | login |
| PUT, DELETE | /api/favorites/:hotelId | login |
| GET | /api/hotels (q, kecamatan, bintangMin, hargaMax, fasilitas=1,2, sort=rating\|harga, page, limit) | publik |
| GET | /api/hotels/nearby (lat, lng, radius, budget) | publik |
| GET | /api/hotels/:id | publik |
| POST, PATCH, DELETE | /api/hotels, /api/hotels/:id (termasuk website; kirim null untuk mengosongkan) | admin |
| POST | /api/hotels/:id/photos (multipart, field foto, maks 5) | admin |
| DELETE | /api/photos/:id | admin |
| POST | /api/hotels/:id/reviews | login |
| DELETE | /api/hotels/:id/reviews/:rid | pemilik / admin |
| GET | /api/facilities | publik |
| POST, PATCH, DELETE | /api/admin/facilities(/:id) | admin |
| GET | /api/admin/users, PATCH /api/admin/users/:id/role | admin |
| GET | /api/admin/stats | admin |
