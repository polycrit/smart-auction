'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCirclePlusFilled, IconMail, type Icon } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

type Item = {
    title: string;
    url: string;
    icon?: Icon;
};

export function NavMain({ items }: { items: Item[] }) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        // exact match or nested path under the item
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            tooltip="Quick Create"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                        >
                            <IconCirclePlusFilled />
                            <Link href="/admin/auctions/new">Quick Create</Link>
                        </SidebarMenuButton>
                        <Button size="icon" className="size-8 group-data-[collapsible=icon]:opacity-0" variant="outline">
                            <IconMail />
                            <span className="sr-only">Inbox</span>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>

                <SidebarMenu>
                    {items.map((item) => {
                        const active = isActive(item.url);
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    className={`justify-start ${active ? 'bg-accent text-accent-foreground' : ''}`}
                                    data-active={active ? '' : undefined}
                                >
                                    <Link href={item.url} aria-current={active ? 'page' : undefined}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
