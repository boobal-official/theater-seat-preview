import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Avengers: Doomsday — 3D Theater Seat Preview",
  description:
    "Interactive 2D seat selection and first-person 3D cinema hall seat preview experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-[#08080A] text-white antialiased selection:bg-[#3B7BF6]/30 selection:text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
