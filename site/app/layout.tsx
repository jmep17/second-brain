import "./global.css";
import { Provider } from "@/components/provider";
import { VaultDevClient } from "@/components/dev-client";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          <VaultDevClient />
          {children}
        </Provider>
      </body>
    </html>
  );
}
