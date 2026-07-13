/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/utilities.css";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "Sketch Forge", template: "%s · Sketch Forge" },
  description:
    "The canvas notebook for engineers: system diagrams, lecture notes, and rough thinking on an infinite canvas.",
  openGraph: {
    title: "Sketch Forge",
    description:
      "The canvas notebook for engineers: system diagrams, lecture notes, and rough thinking on an infinite canvas.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Sketch Forge" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/*
          These families are referenced by literal name inside the canvas text
          tool (StylePanel / renderElement), so they must load globally.
        */}
        <link
          href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Indie+Flower&family=Patrick+Hand&family=Inter:wght@400;700&family=Poppins:wght@400;700&family=Nunito:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Courier+Prime:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
