"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { SeatArt } from "@/components/SeatArt"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/Field"
import { login, logoutRequest, register } from "@/lib/api"
import { useUserStore } from "@/store/userStore"

// One form for three screens: attendee log in, attendee sign up, organizer log in.
type Mode = "login" | "signup" | "organizer"

const TEXT = {
  login: {
    title: "Log in",
    intro: "Log in to book seats and see your bookings.",
    button: "Log in",
    busy: "Logging in…",
    sideTitle: "Book seats for live events",
    sideText:
      "Choose seats on the map, hold them while you confirm, and cancel any time.",
  },
  signup: {
    title: "Create an account",
    intro: "Sign up to book seats and see your bookings.",
    button: "Create account",
    busy: "Creating account…",
    sideTitle: "Book seats for live events",
    sideText:
      "Choose seats on the map, hold them while you confirm, and cancel any time.",
  },
  organizer: {
    title: "Organizer log in",
    intro: "Create events and set how seats are held and booked.",
    button: "Log in as organizer",
    busy: "Logging in…",
    sideTitle: "Run your events",
    sideText:
      "Set up a seating grid for each event and decide how long seats stay held.",
  },
}

type Errors = { name?: string; email?: string; password?: string }

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const text = TEXT[mode]

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError("")

    // 1. check the fields (only when the button is pressed, not while typing)
    const newErrors: Errors = {}
    if (mode === "signup" && !name.trim()) {
      newErrors.name = "Write your name"
    }
    if (!email.includes("@")) {
      newErrors.email = "Write an email address with an @"
    }
    if (mode === "signup" && password.length < 8) {
      newErrors.password = "Use at least 8 characters"
    }
    if (mode !== "signup" && !password) {
      newErrors.password = "Write your password"
    }
    setErrors(newErrors)

    // put the cursor in the first field that failed
    const firstBad = Object.keys(newErrors)[0]
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }

    // 2. ask the server
    setBusy(true)
    try {
      const result =
        mode === "signup"
          ? await register(name.trim(), email, password)
          : await login(email, password)

      if (mode === "organizer" && result.user.role !== "organizer") {
        await logoutRequest() // remove the cookie we just got
        setFormError(
          "This account is not an organizer. Use the attendee log in."
        )
        return
      }

      await useUserStore.getState().loadUser()
      router.push(mode === "organizer" ? "/organizer" : "/")
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* left: what the app does (large screens only) */}
      <div className="hidden flex-col justify-center gap-12 border-r bg-card p-12 lg:flex">
        <div className="max-w-md">
          <p className="font-heading text-6xl leading-[1.02] font-bold">
            {text.sideTitle}
          </p>
          <p className="mt-5 text-lg text-muted-foreground">{text.sideText}</p>
        </div>
        <SeatArt />
      </div>

      {/* right: the form */}
      <div className="flex flex-col px-6 py-8 lg:p-12">
        <div className="flex w-full max-w-sm flex-1 flex-col lg:mx-auto">
          <Link href="/" className="font-heading text-2xl font-bold">
            Event Seats
          </Link>

          <div className="my-auto w-full py-10">
            <h1 className="text-5xl leading-none font-bold">{text.title}</h1>
            <p className="mt-3 text-muted-foreground">{text.intro}</p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-8 flex flex-col gap-5"
            >
              {mode === "signup" && (
                <Field
                  id="name"
                  label="Name"
                  autoComplete="name"
                  value={name}
                  onChange={setName}
                  error={errors.name}
                />
              )}
              <Field
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                error={errors.email}
              />
              <Field
                id="password"
                label="Password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={setPassword}
                error={errors.password}
                hint={mode === "signup" ? "At least 8 characters" : undefined}
              />

              <Button
                type="submit"
                disabled={busy}
                className="mt-1 h-12 w-full text-base font-semibold"
              >
                {busy ? text.busy : text.button}
              </Button>

              {/* a failure from the server; everything typed stays in the form */}
              <p role="alert" className="min-h-5 text-sm text-destructive">
                {formError}
              </p>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t pt-6 text-sm text-muted-foreground">
              {mode === "login" && (
                <>
                  <p>
                    New here?{" "}
                    <Link href="/signup" className="link-draw text-foreground">
                      Create an account
                    </Link>
                  </p>
                  <p>
                    Organizing events?{" "}
                    <Link
                      href="/organizer/login"
                      className="link-draw text-foreground"
                    >
                      Organizer log in
                    </Link>
                  </p>
                </>
              )}
              {mode === "signup" && (
                <p>
                  Already have an account?{" "}
                  <Link href="/login" className="link-draw text-foreground">
                    Log in
                  </Link>
                </p>
              )}
              {mode === "organizer" && (
                <p>
                  Not an organizer?{" "}
                  <Link href="/login" className="link-draw text-foreground">
                    Attendee log in
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
