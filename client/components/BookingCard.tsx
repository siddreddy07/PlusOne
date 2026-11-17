"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { MyBooking } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/format"

const STATUS_TEXT: Record<MyBooking["status"], string> = {
  confirmed: "Confirmed",
  held: "Payment pending",
  cancelled: "Cancelled",
  expired: "Expired",
}

type Props = {
  booking: MyBooking
  cancelling: boolean
  onCancel: (bookingId: number) => void
}

// One booking: the event, the seats and what you can do with it.
export function BookingCard({ booking, cancelling, onCancel }: Props) {
  const [asking, setAsking] = useState(false) // true while we ask "cancel this booking?"
  const canCancel = booking.status === "confirmed"
  const isDone = booking.status === "cancelled" || booking.status === "expired"

  return (
    <li className={`rounded-lg border bg-card p-5 ${isDone ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl leading-none font-bold">{booking.eventName}</h2>
          <p className="mt-2 text-muted-foreground">
            {booking.venue} · {formatDate(booking.eventDate)} · {formatTime(booking.eventDate)}
          </p>
        </div>
        <span
          className={`rounded-md border px-3 py-1 text-sm ${
            booking.status === "confirmed" ? "border-primary text-foreground" : "text-muted-foreground"
          }`}
        >
          {STATUS_TEXT[booking.status]}
        </span>
      </div>

      <p className="mt-5 text-lg">
        <span className="text-muted-foreground">
          {booking.seats.length === 1 ? "Seat" : "Seats"}:{" "}
        </span>
        {booking.seats.join(", ")}
      </p>

      {booking.status === "held" && (
        <Link href={`/events/${booking.eventId}`} className="link-draw mt-5 inline-block">
          Finish payment
        </Link>
      )}

      {canCancel &&
        (asking ? (
          <div className="mt-5 flex flex-wrap items-center gap-3" role="group" aria-label="Cancel this booking?">
            <p>Cancel this booking?</p>
            <Button
              variant="outline"
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="h-11 px-5 text-base"
            >
              Yes, cancel booking
            </Button>
            <Button variant="outline" onClick={() => setAsking(false)} disabled={cancelling} className="h-11 px-5 text-base">
              Keep booking
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAsking(true)} className="mt-5 h-11 px-5 text-base">
            Cancel booking
          </Button>
        ))}
    </li>
  )
}
