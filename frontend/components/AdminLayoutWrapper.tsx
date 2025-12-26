'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type AdminLayoutWrapperProps = {
    children: React.ReactNode;
};

export function AdminLayoutWrapper({ children }: AdminLayoutWrapperProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isLoginPage = pathname === '/admin/login';

    useEffect(() => {
        // Redirect to login if not authenticated and not on login page
        if (!isLoading && !user && !isLoginPage) {
            router.push('/admin/login');
        }
        // Redirect to admin if authenticated and on login page
        if (!isLoading && user && isLoginPage) {
            router.push('/admin');
        }
    }, [user, isLoading, isLoginPage, router]);

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // Render login page without sidebar
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    // Render admin layout with sidebar for authenticated users
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': 'calc(var(--spacing) * 72)',
                    '--header-height': 'calc(var(--spacing) * 12)',
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
