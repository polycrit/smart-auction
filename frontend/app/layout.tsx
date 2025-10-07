import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
    title: 'Smart Auction',
    description: 'Full-stack auction skeleton',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
