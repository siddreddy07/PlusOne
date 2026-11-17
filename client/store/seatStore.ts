import { create } from "zustand"

import {
  cancelBooking,
  confirmBooking,
  getEvent,
  getMyBookings,
  getSeats,
  getSettings,
  holdSeats,
  type EventItem,
  type Hold,
  type Seat,
  type Settings,
} from "@/lib/api"

// Everything about the seat page of one event: the map, the picked seats and the hold.
type SeatStore = {
  event: EventItem | null
  seats: Seat[] | null
  settings: Settings | null
  selected: number[] // picked, not held yet
  hold: Hold | null // the booking that holds the seats
  confirmed: boolean
  error: string
  busy: boolean

  load: (eventId: number, isAttendee: boolean) => Promise<void>
  refreshSeats: (eventId: number) => Promise<void>
  toggleSeat: (seatId: number) => void
  holdPicked: (eventId: number) => Promise<void>
  confirm: (eventId: number) => Promise<void>
  release: (eventId: number) => Promise<void>
  expire: (eventId: number) => Promise<void>
  reset: () => void
}

const empty = {
  event: null,
  seats: null,
  settings: null,
  selected: [],
  hold: null,
  confirmed: false,
  error: "",
  busy: false,
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export const useSeatStore = create<SeatStore>((set, get) => ({
  ...empty,

  // first load: event, seats, settings, and any hold this user already has here
  load: async (eventId, isAttendee) => {
    set({ ...empty })
    try {
      const [event, seats, settings] = await Promise.all([getEvent(eventId), getSeats(eventId), getSettings()])
      set({ event, seats, settings })

      if (isAttendee) {
        const mine = await getMyBookings()
        const active = mine.find(
          (booking) =>
            booking.eventId === eventId &&
            booking.status === "held" &&
            booking.holdExpiresAt !== null &&
            new Date(booking.holdExpiresAt).getTime() > Date.now()
        )
        if (active?.holdExpiresAt) {
          set({ hold: { id: active.id, holdExpiresAt: active.holdExpiresAt } })
        }
      }
    } catch (error) {
      set({ error: messageOf(error, "Could not load this event.") })
    }
  },

  refreshSeats: async (eventId) => {
    try {
      set({ seats: await getSeats(eventId) })
    } catch {
      // keep showing the last map; the next refresh will try again
    }
  },

  toggleSeat: (seatId) => {
    const { selected, settings } = get()
    const maxSeats = settings?.max_seats_per_booking ?? 4
    set({ error: "", confirmed: false })

    if (selected.includes(seatId)) {
      set({ selected: selected.filter((id) => id !== seatId) })
    } else if (selected.length >= maxSeats) {
      set({ error: `You can pick up to ${maxSeats} seats at a time.` })
    } else {
      set({ selected: [...selected, seatId] })
    }
  },

  holdPicked: async (eventId) => {
    set({ busy: true, error: "" })
    try {
      set({ hold: await holdSeats(eventId, get().selected) })
    } catch (error) {
      set({ error: messageOf(error, "Could not hold these seats.") })
    }
    set({ selected: [] })
    await get().refreshSeats(eventId)
    set({ busy: false })
  },

  confirm: async (eventId) => {
    const { hold } = get()
    if (!hold) return
    set({ busy: true, error: "" })
    try {
      await confirmBooking(hold.id)
      set({ confirmed: true })
    } catch (error) {
      set({ error: messageOf(error, "Could not confirm this booking.") })
    }
    set({ hold: null })
    await get().refreshSeats(eventId)
    set({ busy: false })
  },

  release: async (eventId) => {
    const { hold } = get()
    if (!hold) return
    set({ busy: true, error: "" })
    try {
      await cancelBooking(hold.id)
    } catch (error) {
      set({ error: messageOf(error, "Could not release these seats.") })
    }
    set({ hold: null })
    await get().refreshSeats(eventId)
    set({ busy: false })
  },

  // the timer reached 0
  expire: async (eventId) => {
    set({ hold: null, error: "Your hold ran out and the seats were released. Pick them again to book." })
    await get().refreshSeats(eventId)
  },

  reset: () => set({ ...empty }),
}))
