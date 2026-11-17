"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import type { User } from "@/lib/auth"
import { useUserStore } from "@/store/userStore"

// The bar at the top of every logged-in page.
export function Navbar({ user }: { user: User | null }) {
  const router = useRouter()

  async function handleLogout() {
    await useUserStore.getState().logOut()
    router.push("/login")
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-2xl font-bold">
          Event Seats
        </Link>

        <div className="flex items-center gap-5">
          {user?.role === "organizer" && (
            <Link href="/organizer" className="link-draw text-sm">
              Organizer
            </Link>
          )}
          {user?.role === "attendee" && (
            <Link href="/bookings" className="link-draw text-sm">
              My bookings
            </Link>
          )}
          {user && <span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span>}
          <Button variant="outline" onClick={handleLogout} className="h-10 px-4 text-sm">
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
