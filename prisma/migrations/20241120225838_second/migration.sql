/*
  Warnings:

  - Added the required column `alergias` to the `DentalData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alimentacion` to the `DentalData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enfermedadesPersonales` to the `DentalData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `habitos` to the `DentalData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `higieneBucal` to the `DentalData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `motivoConsulta` to the `DentalData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DentalData" ADD COLUMN     "alergias" VARCHAR(200) NOT NULL,
ADD COLUMN     "alimentacion" VARCHAR(200) NOT NULL,
ADD COLUMN     "enfermedadesPersonales" JSONB NOT NULL,
ADD COLUMN     "habitos" JSONB NOT NULL,
ADD COLUMN     "higieneBucal" VARCHAR(200) NOT NULL,
ADD COLUMN     "motivoConsulta" JSONB NOT NULL;
