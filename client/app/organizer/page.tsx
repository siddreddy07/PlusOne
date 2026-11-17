"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { EventForm } from "@/components/EventForm"
import { Navbar } from "@/components/Navbar"
import { SettingsCard } from "@/components/SettingsCard"
import { useUser } from "@/lib/useUser"

// Organizer only: make an event, and change the booking settings.
export default function OrganizerPage() {
  const user = useUser()
  const router = useRouter()

  // attendees have nothing to do here
  useEffect(() => {
    if (user && user.role !== "organizer") {
      router.replace("/")
    }
  }, [user, router])

  if (!user || user.role !== "organizer") {
    return null
  }

  return (
    <>
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link href="/" className="link-draw text-sm text-muted-foreground hover:text-foreground">
          All events
        </Link>
        <h1 className="mt-4 text-5xl leading-none font-bold">Organizer</h1>
        <p className="mt-3 text-muted-foreground">Set up events and choose how bookings work.</p>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <EventForm />
          <SettingsCard />
        </div>
      </main>
    </>
  )
}
