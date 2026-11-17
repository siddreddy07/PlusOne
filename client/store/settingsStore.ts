import { create } from "zustand"

import { getSettings, updateSetting, type Settings } from "@/lib/api"

// The two numbers the organizer can change.
type SettingsStore = {
  settings: Settings | null // null while loading
  error: string
  loadSettings: () => Promise<void>
  save: (next: Settings) => Promise<boolean> // true when everything was saved
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  error: "",

  loadSettings: async () => {
    try {
      set({ settings: await getSettings(), error: "" })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not load the settings." })
    }
  },

  save: async (next) => {
    const current = get().settings
    try {
      // only send the values that changed
      if (!current || next.hold_duration_minutes !== current.hold_duration_minutes) {
        await updateSetting("hold_duration_minutes", next.hold_duration_minutes)
      }
      if (!current || next.max_seats_per_booking !== current.max_seats_per_booking) {
        await updateSetting("max_seats_per_booking", next.max_seats_per_booking)
      }
      set({ settings: next, error: "" })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not save the settings." })
      return false
    }
  },
}))
