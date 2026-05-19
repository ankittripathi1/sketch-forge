import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";

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
    "A canvas-first notebook for drawing, thinking, and organizing ideas.",
  openGraph: {
    title: "Sketch Forge",
    description:
      "A canvas-first notebook for drawing, thinking, and organizing ideas.",
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
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&family=Indie+Flower&family=Patrick+Hand&family=Inter:wght@400;700&family=Poppins:wght@400;700&family=Nunito:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Courier+Prime:wght@400;700&family=Spectral:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem={false}
          storageKey="sketch-forge-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
