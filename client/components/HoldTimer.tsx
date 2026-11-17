"use client"

import { useEffect, useState } from "react"

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

// Counts down to the time the held seats are given back. Calls onExpire once at 0.
export function HoldTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => secondsLeft(expiresAt))

  useEffect(() => {
    const timer = setInterval(() => {
      const seconds = secondsLeft(expiresAt)
      setLeft(seconds)
      if (seconds === 0) {
        clearInterval(timer)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(left / 60)
  const seconds = String(left % 60).padStart(2, "0")

  return (
    <p role="timer" className="font-heading text-5xl leading-none font-bold tabular-nums">
      {minutes}:{seconds}
    </p>
  )
}
