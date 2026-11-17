CREATE TYPE "public"."booking_status" AS ENUM('held', 'confirmed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."seat_status" AS ENUM('available', 'held', 'booked');--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_status_check";--> statement-breakpoint
ALTER TABLE "seats" DROP CONSTRAINT "seats_status_check";--> statement-breakpoint
ALTER TABLE "seats" DROP CONSTRAINT "seats_owner_check";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."booking_status" USING "status"::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "status" SET DATA TYPE "public"."seat_status" USING "status"::"public"."seat_status";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'held';--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "status" SET DEFAULT 'available';--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_owner_check" CHECK (("seats"."status" = 'available' and "seats"."booking_id" is null)
        or ("seats"."status" <> 'available' and "seats"."booking_id" is not null));
