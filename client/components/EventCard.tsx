import Link from "next/link"

import type { EventItem } from "@/lib/api"
import { formatDay, formatMonth, formatTime } from "@/lib/format"

// One event in the list. The whole card is a link to its seat map.
export function EventCard({ event }: { event: EventItem }) {
  const soldOut = event.availableSeats === 0
  const freePercent = event.totalSeats > 0 ? (event.availableSeats / event.totalSeats) * 100 : 0

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex flex-col justify-between gap-6 rounded-lg border bg-card p-5 outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-3xl leading-none font-bold">{event.name}</h2>
          <p className="mt-2 text-muted-foreground">{event.venue}</p>
          <p className="mt-1 text-muted-foreground">{formatTime(event.date)}</p>
        </div>

        <div className="shrink-0 rounded-md border px-3.5 py-2 text-center">
          <p className="font-heading text-3xl leading-none font-bold">{formatDay(event.date)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatMonth(event.date)}</p>
        </div>
      </div>

      <div>
        <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary" style={{ width: `${freePercent}%` }} />
        </div>
        <p className="mt-2 text-sm">
          {soldOut ? "Sold out" : `${event.availableSeats} of ${event.totalSeats} seats free`}
        </p>
      </div>
    </Link>
  )
}
