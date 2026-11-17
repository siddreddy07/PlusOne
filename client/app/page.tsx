"use client"

import { useCallback, useEffect, useState } from "react"

import { EventCard } from "@/components/EventCard"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getEvents, type EventItem } from "@/lib/api"
import { useUser } from "@/lib/useUser"

// Home: every event, with how many seats are still free.
export default function HomePage() {
  const user = useUser()
  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [error, setError] = useState("")

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await getEvents())
      setError("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load events.")
    }
  }, [])

  useEffect(() => {
    if (user) {
      // load the events once the user is known
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEvents()
    }
  }, [user, loadEvents])

  if (!user) {
    return null
  }

  return (
    <>
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="text-5xl leading-none font-bold">Events</h1>
        <p className="mt-3 text-muted-foreground">Pick an event to choose your seats.</p>

        {error ? (
          <div className="mt-10 flex flex-col items-start gap-4" role="alert">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadEvents} className="h-11 px-5 text-base">
              Try again
            </Button>
          </div>
        ) : events === null ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="mt-10 text-muted-foreground">There are no events yet. Check back soon.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
