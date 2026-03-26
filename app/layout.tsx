// app/layout.tsx
import "./globals.css";

// Removed Google Font import to fix network-related build errors in Docker
// const inter = Inter({ subsets: ["latin"] });

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
      <body className="antialiased font-sans">
        {/* Remove any navigation that conflicts with landing page */}
        {children}
      </body>
    </html>
  );
}