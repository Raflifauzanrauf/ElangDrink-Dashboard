"use client";

import { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const CLIENT_ID: string = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function GoogleProviders({ children }: { children: ReactNode }) {
  if (!CLIENT_ID) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
