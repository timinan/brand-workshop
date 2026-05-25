import "./globals.css";

export const metadata = { title: "Brand Workshop", description: "Multiagent brand kit generator" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
