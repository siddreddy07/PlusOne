"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect } from "react"

import { HoldTimer } from "@/components/HoldTimer"
import { Navbar } from "@/components/Navbar"
import { SeatMap } from "@/components/SeatMap"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Seat } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/format"
import { useUser } from "@/lib/useUser"
import { useSeatStore } from "@/store/seatStore"

// Seat map for one event. Pick seats, hold them, then confirm before the timer ends.
export default function EventPage() {
  const user = useUser()
  const params = useParams<{ id: string }>()
  const eventId = Number(params.id)

  const { event, seats, settings, selected, hold, confirmed, error, busy } = useSeatStore()
  const { load, refreshSeats, toggleSeat, holdPicked, confirm, release, expire, reset } = useSeatStore()

  const isOrganizer = user?.role === "organizer"
  const role = user?.role

  // first load: event, seats, settings, and any hold this user already has here
  useEffect(() => {
    if (!role) return
    load(eventId, role === "attendee")
    return reset
  }, [role, eventId, load, reset])

  // other people book too, so look at the map again every 10 seconds
  useEffect(() => {
    if (!role) return
    const timer = setInterval(() => refreshSeats(eventId), 10000)
    return () => clearInterval(timer)
  }, [role, eventId, refreshSeats])

  const handleExpire = useCallback(() => expire(eventId), [expire, eventId])

  if (!user) {
    return null
  }

  const maxSeats = settings?.max_seats_per_booking ?? 4
  const seatName = (seat: Seat) => `${seat.rowLabel}${seat.seatNumber}`
  const pickedSeats = (seats ?? []).filter((seat) => selected.includes(seat.id))
  const heldSeats = (seats ?? []).filter((seat) => seat.mine && seat.status === "held")
  const confirmedSeats = (seats ?? []).filter((seat) => seat.mine && seat.status === "booked")

  const handleHold = () => holdPicked(eventId)
  const handleConfirm = () => confirm(eventId)
  const handleRelease = () => release(eventId)


  return (
    <>
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link href="/" className="link-draw text-sm text-muted-foreground hover:text-foreground">
          All events
        </Link>

        {event ? (
          <>
            <h1 className="mt-4 text-5xl leading-none font-bold">{event.name}</h1>
            <p className="mt-3 text-muted-foreground">
              {event.venue} · {formatDate(event.date)} · {formatTime(event.date)}
            </p>
          </>
        ) : (
          !error && <Skeleton className="mt-4 h-12 w-72" />
        )}

        {!event && error ? (
          <p className="mt-10 text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
            <section className="rounded-lg border bg-card p-5 sm:p-8" aria-label="Seat map">
              <ul className="mb-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded-t-md rounded-b-sm bg-[var(--seat-free-1)]" /> Available
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded-t-md rounded-b-sm bg-primary" /> Yours
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-4 rounded-t-md rounded-b-sm bg-[var(--seat-taken)]" /> Taken
                </li>
              </ul>

              {seats ? (
                <SeatMap
                  seats={seats}
                  selected={selected}
                  locked={isOrganizer || hold !== null || busy}
                  onToggle={toggleSeat}
                />
              ) : (
                <Skeleton className="h-72 w-full" />
              )}
            </section>

            <aside className="rounded-lg border bg-card p-6 lg:sticky lg:top-6" aria-label="Your booking">
              {isOrganizer ? (
                <>
                  <h2 className="text-3xl leading-none font-bold">Seat map</h2>
                  <p className="mt-3 text-muted-foreground">
                    Organizers can look at the seat map but cannot book seats.
                  </p>
                </>
              ) : hold ? (
                <>
                  <h2 className="text-3xl leading-none font-bold">Seats held</h2>
                  <p className="mt-3 text-muted-foreground">Confirm before the time runs out.</p>
                  <div className="mt-5">
                    <HoldTimer expiresAt={hold.holdExpiresAt} onExpire={handleExpire} />
                  </div>
                  <p className="mt-5 text-lg">{heldSeats.map(seatName).join(", ")}</p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button onClick={handleConfirm} disabled={busy} className="h-12 w-full text-base">
                      Confirm booking
                    </Button>
                    <Button variant="outline" onClick={handleRelease} disabled={busy} className="h-12 w-full text-base">
                      Release seats
                    </Button>
                  </div>
                </>
              ) : confirmed ? (
                <>
                  <h2 className="text-3xl leading-none font-bold">Booking confirmed</h2>
                  <p className="mt-3 text-muted-foreground">Your seats are booked.</p>
                  <p className="mt-5 text-lg">{confirmedSeats.map(seatName).join(", ")}</p>
                  <Link href="/" className="link-draw mt-6 inline-block">
                    Back to events
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-3xl leading-none font-bold">Your seats</h2>
                  <p className="mt-3 text-muted-foreground">
                    {pickedSeats.length === 0
                      ? `Pick up to ${maxSeats} seats on the map.`
                      : `${pickedSeats.length} of ${maxSeats} picked.`}
                  </p>
                  <p className="mt-5 min-h-7 text-lg">{pickedSeats.map(seatName).join(", ")}</p>
                  <Button
                    onClick={handleHold}
                    disabled={busy || pickedSeats.length === 0}
                    className="mt-6 h-12 w-full text-base"
                  >
                    {pickedSeats.length > 0
                      ? `Hold ${pickedSeats.length} ${pickedSeats.length === 1 ? "seat" : "seats"}`
                      : "Hold seats"}
                  </Button>
                  {settings && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Held seats stay yours for {settings.hold_duration_minutes} minutes.
                    </p>
                  )}
                </>
              )}

              {error && event && (
                <p className="mt-5 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  )
}
