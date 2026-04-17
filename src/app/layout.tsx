import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM",
  description: "Dark CRM System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${geist.variable} h-full dark`}>
      <body className="h-full bg-[var(--background)] text-[var(--text)]">
        {/* Animated aurora background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div
            className="blob-1 absolute rounded-full"
            style={{
              width: 720,
              height: 720,
              top: -220,
              left: -160,
              background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="blob-2 absolute rounded-full"
            style={{
              width: 640,
              height: 640,
              bottom: -180,
              right: -120,
              background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)",
              filter: "blur(90px)",
            }}
          />
          <div
            className="blob-3 absolute rounded-full"
            style={{
              width: 480,
              height: 480,
              top: "45%",
              left: "55%",
              background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
              filter: "blur(70px)",
            }}
          />
        </div>
        <div className="relative h-full" style={{ zIndex: 1 }}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
