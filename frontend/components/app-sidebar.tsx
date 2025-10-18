'use client';

import * as React from 'react';
import { IconChartBar, IconDashboard, IconHelp, IconSearch, IconSettings, IconUsers, IconHammer } from '@tabler/icons-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import Image from 'next/image';

const data = {
    user: {
        name: 'shadcn',
        email: 'm@example.com',
        avatar: '/avatars/image.png',
    },
    navMain: [
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
    ],
    navSecondary: [
        {
            title: 'Settings',
            url: '/admin/settings',
            icon: IconSettings,
        },
        {
            title: 'Get Help',
            url: '/help',
            icon: IconHelp,
        },
        {
            title: 'Search',
            url: '/search',
            icon: IconSearch,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <a href="#">
                                <Image width={16} height={16} src="/efeso-logo.png" alt="EFESO Logo" />
                                <span className="text-base font-semibold">EFESO Auction Tool</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
