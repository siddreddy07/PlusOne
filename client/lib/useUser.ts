"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { getUser, type User } from "./auth"

// Returns the logged-in user. If nobody is logged in, sends the browser to /login.
// Returns null until the browser has checked (so a page can show nothing for a moment).
export function useUser() {
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

  return user
}
