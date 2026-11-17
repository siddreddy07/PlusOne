"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { useUserStore } from "@/store/userStore"

// Returns the logged-in user. If nobody is logged in, sends the browser to /login.
// Returns null until the browser has checked.
export function useUser() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const checked = useUserStore((state) => state.checked)
  const loadUser = useUserStore((state) => state.loadUser)

  useEffect(() => {
    if (!checked) {
      loadUser()
    } else if (!user) {
      router.replace("/login")
    }
  }, [checked, user, loadUser, router])

  return user
}
