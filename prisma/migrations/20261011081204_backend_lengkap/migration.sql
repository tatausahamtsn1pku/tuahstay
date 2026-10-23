/*
  Warnings:

  - A unique constraint covering the columns `[user_id,hotel_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "hotel_photos" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_facilities" (
    "hotel_id" INTEGER NOT NULL,
    "facility_id" INTEGER NOT NULL,

    CONSTRAINT "hotel_facilities_pkey" PRIMARY KEY ("hotel_id","facility_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facilities_nama_key" ON "facilities"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_hotel_id_key" ON "reviews"("user_id", "hotel_id");

-- AddForeignKey
ALTER TABLE "hotel_photos" ADD CONSTRAINT "hotel_photos_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_facilities" ADD CONSTRAINT "hotel_facilities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_facilities" ADD CONSTRAINT "hotel_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
