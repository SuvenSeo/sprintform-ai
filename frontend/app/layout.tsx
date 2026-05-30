import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprintform AI",
  description: "Computer vision sprint and jump mechanics analysis workstation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

