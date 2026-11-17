"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { logout, type User } from "@/lib/auth"

// The bar at the top of every logged-in page.
export function Navbar({ user }: { user: User | null }) {
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-2xl font-bold">
          Event Seats
        </Link>

        <div className="flex items-center gap-5">
          {user && <span className="hidden text-sm text-muted-foreground sm:block">{user.name}</span>}
          <Button variant="outline" onClick={handleLogout} className="h-10 px-4 text-sm">
            Log out
          </Button>
        </div>
      </div>
    </header>
  )
}
