"use client"

import Link from "next/link"
import { useEffect } from "react"

import { BookingCard } from "@/components/BookingCard"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@/lib/useUser"
import { useBookingsStore } from "@/store/bookingsStore"

// Every booking the user made, with the seats, and a way to cancel.
export default function BookingsPage() {
  const user = useUser()
  const { bookings, error, cancellingId, loadBookings, cancel } = useBookingsStore()

  useEffect(() => {
    if (user) {
      loadBookings()
    }
  }, [user, loadBookings])

  if (!user) {
    return null
  }

  return (
    <>
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-5xl leading-none font-bold">My bookings</h1>
        <p className="mt-3 text-muted-foreground">Your tickets, newest first.</p>

        {error && (
          <div className="mt-8 flex flex-col items-start gap-4" role="alert">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadBookings} className="h-11 px-5 text-base">
              Try again
            </Button>
          </div>
        )}

        {bookings === null && !error ? (
          <div className="mt-10 flex flex-col gap-5">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : bookings && bookings.length === 0 ? (
          <div className="mt-10">
            <p className="text-muted-foreground">You have no bookings yet.</p>
            <Link href="/" className="link-draw mt-4 inline-block">
              Browse events
            </Link>
          </div>
        ) : (
          bookings && (
            <ul className="mt-10 flex flex-col gap-5">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  cancelling={cancellingId === booking.id}
                  onCancel={cancel}
                />
              ))}
            </ul>
          )
        )}
      </main>
    </>
  )
}
