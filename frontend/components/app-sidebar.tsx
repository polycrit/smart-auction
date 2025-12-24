'use client';

import * as React from 'react';
import { IconChartBar, IconDashboard, IconUsers, IconHammer } from '@tabler/icons-react';

import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import Image from 'next/image';

const navItems = [
    {
        title: 'Dashboard',
        url: '/admin/dashboard',
        icon: IconDashboard,
    },
    {
        title: 'Auctions',
        url: '/admin/auctions',
        icon: IconHammer,
    },
    {
        title: 'Analytics',
        url: '/admin/analytics',
        icon: IconChartBar,
    },
    {
        title: 'Vendors',
        url: '/admin/vendors',
        icon: IconUsers,
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <a href="/admin">
                                <Image width={16} height={16} src="/efeso-logo.png" alt="EFESO Logo" />
                                <span className="text-base font-semibold">EFESO Auction Tool</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>
        </Sidebar>
    );
}
