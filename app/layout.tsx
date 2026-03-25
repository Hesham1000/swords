// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Fencing Marketplace - Premier Fencing Community",
  // description:
    // "Connect with elite fencers, discover premium equipment, and elevate your fencing journey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Remove any navigation that conflicts with landing page */}
        {children}
      </body>
    </html>
  );
}