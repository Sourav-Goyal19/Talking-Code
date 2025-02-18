// src/chrome.d.ts
declare namespace chrome {
  export namespace tabs {
    function query(
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Tab[]) => void
    ): void;
    interface Tab {
      id?: number;
      index?: number;
      windowId?: number;
      highlighted?: boolean;
      active?: boolean;
      pinned?: boolean;
      status?: string;
      incognito?: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
      audible?: boolean;
      mutedInfo?: {
        muted: boolean;
        reason: string;
      };
      width?: number;
      height?: number;
      sessionId?: string;
    }
  }
}
