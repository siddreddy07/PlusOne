import { create } from "zustand"

import { cancelBooking, getMyBookings, type MyBooking } from "@/lib/api"

// The "My bookings" page: the user's bookings, newest first.
type BookingsStore = {
  bookings: MyBooking[] | null // null while loading
  error: string
  cancellingId: number | null // the booking being cancelled right now
  loadBookings: () => Promise<void>
  cancel: (bookingId: number) => Promise<void>
}

export const useBookingsStore = create<BookingsStore>((set, get) => ({
  bookings: null,
  error: "",
  cancellingId: null,

  loadBookings: async () => {
    try {
      set({ bookings: await getMyBookings(), error: "" })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not load your bookings." })
    }
  },

  cancel: async (bookingId) => {
    set({ cancellingId: bookingId, error: "" })
    try {
      await cancelBooking(bookingId)
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not cancel this booking." })
    }
    await get().loadBookings()
    set({ cancellingId: null })
  },
}))
