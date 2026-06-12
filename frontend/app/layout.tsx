import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleProviders } from "@/context/GoogleProviders";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Country Explorer",
  description: "Explore countries around the world",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.className}>
      <body>
        <GoogleProviders>
          <AuthProvider>{children}</AuthProvider>
        </GoogleProviders>
      </body>
    </html>
  );
}
