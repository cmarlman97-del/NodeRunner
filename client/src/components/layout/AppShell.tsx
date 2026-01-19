import { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";

export function AppShell({ children, disableScroll = false }: PropsWithChildren<{ disableScroll?: boolean }>) {
  return (
    <div className="h-full w-full flex overflow-hidden bg-muted/40">
      <Sidebar />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <AppHeader />
        <div className={disableScroll ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-auto"}>
          {children}
        </div>
      </main>
    </div>
  );
}
