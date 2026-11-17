"use client"

import Link from "next/link"
import { useState } from "react"

import { Field } from "@/components/Field"
import { Button } from "@/components/ui/button"
import { createEvent } from "@/lib/api"

type Errors = Record<string, string>

// "New event" card: name, description, date and time, venue, and the seating grid.
export function EventForm() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("") // like "2030-01-01T18:00"
  const [venue, setVenue] = useState("")
  const [rows, setRows] = useState("")
  const [seatsPerRow, setSeatsPerRow] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError("")
    setCreated(null)

    // 1. the same rules as the server (only checked when the button is pressed)
    const newErrors: Errors = {}
    if (!name.trim()) newErrors.eventName = "Write the event name"
    if (!date) {
      newErrors.eventDate = "Choose the date and time"
    } else if (new Date(date).getTime() <= Date.now()) {
      newErrors.eventDate = "Choose a date in the future"
    }
    if (!venue.trim()) newErrors.eventVenue = "Write the venue"

    const rowCount = Number(rows)
    if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 26) {
      newErrors.eventRows = "Use a whole number from 1 to 26"
    }
    const perRow = Number(seatsPerRow)
    if (!Number.isInteger(perRow) || perRow < 1 || perRow > 50) {
      newErrors.eventSeats = "Use a whole number from 1 to 50"
    }
    setErrors(newErrors)

    const firstBad = Object.keys(newErrors)[0]
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }

    // 2. ask the server
    setBusy(true)
    try {
      const saved = await createEvent({
        name: name.trim(),
        description: description.trim(),
        date: new Date(date).toISOString(),
        venue: venue.trim(),
        rowCount,
        seatsPerRow: perRow,
      })
      setCreated({ id: saved.id, name: saved.name })
      setName("")
      setDescription("")
      setDate("")
      setVenue("")
      setRows("")
      setSeatsPerRow("")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create the event.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border bg-card p-6 sm:p-8" aria-labelledby="new-event-title">
      <h2 id="new-event-title" className="text-3xl leading-none font-bold">
        New event
      </h2>
      <p className="mt-3 text-muted-foreground">The seats are made from the grid you choose.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <Field id="eventName" label="Event name" value={name} onChange={setName} error={errors.eventName} />
        <Field
          id="eventDescription"
          label="Description (optional)"
          value={description}
          onChange={setDescription}
        />
        <Field
          id="eventDate"
          label="Date and time"
          type="datetime-local"
          value={date}
          onChange={setDate}
          error={errors.eventDate}
        />
        <Field id="eventVenue" label="Venue" value={venue} onChange={setVenue} error={errors.eventVenue} />

        <div className="grid grid-cols-2 gap-4">
          <Field
            id="eventRows"
            label="Rows"
            type="number"
            inputMode="numeric"
            value={rows}
            onChange={setRows}
            error={errors.eventRows}
            hint="1 to 26"
          />
          <Field
            id="eventSeats"
            label="Seats per row"
            type="number"
            inputMode="numeric"
            value={seatsPerRow}
            onChange={setSeatsPerRow}
            error={errors.eventSeats}
            hint="1 to 50"
          />
        </div>

        <Button type="submit" disabled={busy} className="mt-1 h-12 w-full text-base font-semibold">
          {busy ? "Creating event…" : "Create event"}
        </Button>

        <div role="status" className="min-h-5 text-sm">
          {created && (
            <p>
              Created {created.name}.{" "}
              <Link href={`/events/${created.id}`} className="link-draw">
                View seat map
              </Link>
            </p>
          )}
          {formError && (
            <p role="alert" className="text-destructive">
              {formError}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}
