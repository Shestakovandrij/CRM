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
    <html lang="uk" className={`${geist.variable} h-full`}>
      <body className="h-full bg-[var(--background)] text-[var(--text)]">
        {/* Aurora background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div
            className="blob-1 absolute rounded-full"
            style={{
              width: 800, height: 800, top: -280, left: -200,
              background: "radial-gradient(circle, rgba(79,142,247,0.18) 0%, transparent 70%)",
              filter: "blur(90px)",
            }}
          />
          <div
            className="blob-2 absolute rounded-full"
            style={{
              width: 680, height: 680, bottom: -200, right: -150,
              background: "radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
          />
          <div
            className="blob-3 absolute rounded-full"
            style={{
              width: 500, height: 500, top: "50%", left: "60%",
              background: "radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)",
              filter: "blur(80px)",
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
