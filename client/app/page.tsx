"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { getUser, logout, type User } from "@/lib/auth"

// Temporary home screen: it only proves you are logged in.
// The events list replaces it in the next step.
export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const saved = getUser()
    if (saved) {
      // localStorage only exists in the browser, so we read it after the page loads
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(saved)
    } else {
      router.replace("/login")
    }
  }, [router])

  function handleLogout() {
    logout()
    router.push("/login")
  }

  if (!user) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-5xl leading-none font-bold">Hi, {user.name}</h1>
      <p className="text-muted-foreground">
        You are logged in as {user.role === "organizer" ? "an organizer" : "an attendee"} ({user.email}).
      </p>
      <div>
        <Button variant="outline" onClick={handleLogout} className="h-11 px-5 text-base">
          Log out
        </Button>
      </div>
    </main>
  )
}
