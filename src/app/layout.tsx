import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anastrophe.",
  description: "αμφιγράμματα by upayan :)",
};

import { ThemeProvider } from "@/context/ThemeContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {/* Floating background mandalas */}
          <div className="mandala-bg-container">
            <div className="mandala mandala-left"></div>
            <div className="mandala mandala-rt"></div>
            <div className="mandala mandala-rb"></div>
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
