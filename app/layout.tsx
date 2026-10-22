import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "MedEx | Explore care",
  description:
    "Compare healthcare services and providers across Thailand, Nepal and India",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
