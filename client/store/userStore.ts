import { create } from "zustand"

import { getMe, logoutRequest } from "@/lib/api"
import type { User } from "@/lib/auth"

// Who is logged in. Every page reads it from here.
type UserStore = {
  user: User | null
  checked: boolean // true once we asked the server who is logged in
  loadUser: () => Promise<void>
  logOut: () => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  checked: false,

  // ask the server (it reads the login cookie)
  loadUser: async () => {
    try {
      set({ user: await getMe(), checked: true })
    } catch {
      set({ user: null, checked: true })
    }
  },

  logOut: async () => {
    try {
      await logoutRequest()
    } finally {
      set({ user: null })
    }
  },
}))
