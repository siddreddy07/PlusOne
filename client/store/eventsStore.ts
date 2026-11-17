import { create } from "zustand"

import { getEvents, type EventItem } from "@/lib/api"

// The list of events on the home page.
type EventsStore = {
  events: EventItem[] | null // null while loading
  error: string
  loadEvents: () => Promise<void>
}

export const useEventsStore = create<EventsStore>((set) => ({
  events: null,
  error: "",

  loadEvents: async () => {
    try {
      set({ events: await getEvents(), error: "" })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not load events." })
    }
  },
}))
