// Shared dark centered auth shell, used by BOTH the Stack Auth handler
// (/handler/[...stack], cloud) and the local/OSS auth pages (/auth/login,
// /auth/signup). Clean centered card that wraps the auth form (`children`).

import type { ReactNode } from "react";

import { BrandLogo } from "@/components/BrandLogo";

export function AuthShell({
  children,
  enterpriseSlot,
}: {
  children: ReactNode;
  enterpriseSlot?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex justify-center">
          <BrandLogo className="h-7" />
        </div>
        {children}
      </div>
    </div>
  );
}
