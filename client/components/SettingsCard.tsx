"use client"

import { useEffect, useState } from "react"

import { Field } from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSettingsStore } from "@/store/settingsStore"

type Errors = Record<string, string>

// "Settings" card: how long seats are held, and how many seats one booking can have.
export function SettingsCard() {
  const { settings, error, loadSettings, save } = useSettingsStore()
  const [hold, setHold] = useState("")
  const [maxSeats, setMaxSeats] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // put the saved numbers in the fields once they arrive
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHold(String(settings.hold_duration_minutes))
      setMaxSeats(String(settings.max_seats_per_booking))
    }
  }, [settings])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaved(false)

    const newErrors: Errors = {}
    const holdMinutes = Number(hold)
    if (!Number.isInteger(holdMinutes) || holdMinutes < 1 || holdMinutes > 60) {
      newErrors.holdMinutes = "Use a whole number from 1 to 60"
    }
    const max = Number(maxSeats)
    if (!Number.isInteger(max) || max < 1 || max > 20) {
      newErrors.maxSeats = "Use a whole number from 1 to 20"
    }
    setErrors(newErrors)

    const firstBad = Object.keys(newErrors)[0]
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }

    setBusy(true)
    const ok = await save({ hold_duration_minutes: holdMinutes, max_seats_per_booking: max })
    setSaved(ok)
    setBusy(false)
  }

  return (
    <section className="rounded-lg border bg-card p-6 sm:p-8" aria-labelledby="settings-title">
      <h2 id="settings-title" className="text-3xl leading-none font-bold">
        Settings
      </h2>
      <p className="mt-3 text-muted-foreground">Saved changes apply to the next booking.</p>

      {settings === null && !error ? (
        <Skeleton className="mt-6 h-40" />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <Field
            id="holdMinutes"
            label="Hold time (minutes)"
            type="number"
            inputMode="numeric"
            value={hold}
            onChange={setHold}
            error={errors.holdMinutes}
            hint="How long picked seats stay held. 1 to 60."
          />
          <Field
            id="maxSeats"
            label="Most seats in one booking"
            type="number"
            inputMode="numeric"
            value={maxSeats}
            onChange={setMaxSeats}
            error={errors.maxSeats}
            hint="1 to 20."
          />

          <Button type="submit" disabled={busy} className="mt-1 h-12 w-full text-base font-semibold">
            {busy ? "Saving settings…" : "Save settings"}
          </Button>

          <div role="status" className="min-h-5 text-sm">
            {saved && <p>Settings saved.</p>}
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
