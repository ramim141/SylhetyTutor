import { create } from "zustand";
import * as notificationsApi from "../api/notifications";

/** The bell's number. The list itself is loaded by the page; this only keeps the count fresh. */
export const useNotificationStore = create((set) => ({
  unread: 0,

  refresh: async () => {
    try {
      set({ unread: await notificationsApi.getUnreadCount() });
    } catch {
      // the bell is a hint: a network blip must not show an error on every page
    }
  },

  setUnread: (unread) => set({ unread }),
  reset: () => set({ unread: 0 }),
}));
