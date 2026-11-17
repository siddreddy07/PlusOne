CREATE TABLE "booking_seats" (
	"booking_id" integer NOT NULL,
	"seat_id" integer NOT NULL,
	CONSTRAINT "booking_seats_booking_id_seat_id_pk" PRIMARY KEY("booking_id","seat_id")
);
--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_seat_id_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "public"."seats"("id") ON DELETE no action ON UPDATE no action;