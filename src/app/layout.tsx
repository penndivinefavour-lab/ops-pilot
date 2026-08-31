import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpsPilot — The Human-Agent Operations Room',
  description: 'An agent-native operations workspace where humans and AI agents operate on the same state through WebMCP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-ops-background text-ops-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
