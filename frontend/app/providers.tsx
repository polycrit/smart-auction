'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"; // optional

export default function Providers({ children }: PropsWithChildren) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: false,
                        retry: 2,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={client}>
            <AuthProvider>
                {children}
                <Toaster richColors position="top-right" />
            </AuthProvider>
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
    );
}
