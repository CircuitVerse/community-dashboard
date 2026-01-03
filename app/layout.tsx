import {
  Figtree,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { getConfig } from "@/lib/config";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Get config for metadata
const config = getConfig();

export const metadata: Metadata = {
  title: config.meta.title,
  description: config.meta.description,
  icons: {
    icon: config.meta.favicon_url,
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: config.meta.title,
    description: config.meta.description,
    images: [config.meta.image_url],
    url: config.meta.site_url,
  },
  twitter: {
    card: "summary_large_image",
    title: config.meta.title,
    description: config.meta.description,
    images: [config.meta.image_url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${figtree.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-black transition-colors">
            <Navbar config={config} />
            <main className="flex-1">{children}</main>
            <Footer config={config} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
