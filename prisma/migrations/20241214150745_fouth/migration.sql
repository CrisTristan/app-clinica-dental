-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Confirmed', 'toBeConfirmed', 'Cancelled');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "status" "AppointmentStatus";
