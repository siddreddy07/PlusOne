// Turns the date text from the server (like "2026-12-14T21:40:00.000Z")
// into text for people, in the viewer's own time zone.

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric" })
}

export function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short" })
}

// "Sat, 14 Dec 2026"
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// "9:40 pm"
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
