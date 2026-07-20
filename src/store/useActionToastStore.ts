import { create } from "zustand";

// 寫入動作完成後的全域提示：訊息 + 可選的「去哪看結果」入口
// nonce 讓連續觸發時重置自動消失計時
interface ActionToastStore {
  message: string | null;
  href: string | null;
  linkLabel: string | null;
  nonce: number;
  show: (message: string, href?: string, linkLabel?: string) => void;
  clear: () => void;
}

export const useActionToastStore = create<ActionToastStore>((set) => ({
  message: null,
  href: null,
  linkLabel: null,
  nonce: 0,
  show: (message, href, linkLabel) =>
    set((state) => ({
      message,
      href: href ?? null,
      linkLabel: linkLabel ?? null,
      nonce: state.nonce + 1,
    })),
  clear: () => set({ message: null, href: null, linkLabel: null }),
}));
