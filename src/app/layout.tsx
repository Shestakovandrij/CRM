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
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
