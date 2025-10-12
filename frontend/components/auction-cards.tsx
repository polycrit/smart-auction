'use client';

import Link from 'next/link';
import { Plus, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Auction, AuctionStatus } from '@/types/auction';
import { adminDelete } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { auctionsKeys } from '@/lib/queryKeys';

const STATUS_META: Record<AuctionStatus, { label: string; dot: string }> = {
    draft: { label: 'Draft', dot: 'bg-slate-400' },
    live: { label: 'Live', dot: 'bg-emerald-500' },
    paused: { label: 'Paused', dot: 'bg-amber-500' },
    ended: { label: 'Ended', dot: 'bg-rose-500' },
};

function StatusIndicator({ status }: { status: AuctionStatus }) {
    const meta = STATUS_META[status];
    return (
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
            {meta.label}
        </span>
    );
}

function formatWhen(start?: string | null, end?: string | null) {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e) return `${s.toLocaleString()} → ${e.toLocaleString()}`;
    if (s) return `Starts ${s.toLocaleString()}`;
    if (e) return `Ends ${e.toLocaleString()}`;
    return 'Unscheduled';
}

/* -------- Single Auction Card -------- */
function AuctionCard({ auction }: { auction: Auction }) {
    const href = `/admin/${auction.slug}`;
    const parts = auction.lots?.length ?? 0;
    const queryClient = useQueryClient();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${auction.title}"? This will permanently delete all lots, participants, and bids.`)) {
            return;
        }

        try {
            await adminDelete(`auctions/${auction.slug}`);
            toast.success('Auction deleted successfully');
            queryClient.invalidateQueries({ queryKey: auctionsKeys.all });
        } catch (err) {
            toast.error('Failed to delete auction');
            console.error(err);
        }
    };

    return (
        <div className="group relative h-full">
            <Card className="@container/card h-full flex flex-col transition-all group-hover:-translate-y-0.5 group-hover:shadow-xs">
                <Link href={href} className="flex-1 flex flex-col">
                    <CardHeader className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle className="break-words text-base leading-snug line-clamp-2 sm:text-lg">{auction.title}</CardTitle>
                            <CardDescription className="mt-1 break-words">
                                {formatWhen(auction.start_time ?? null, auction.end_time ?? null)}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusIndicator status={auction.status} />
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0 flex-1" />

                    <CardFooter className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
                        <span>{parts > 0 ? `${parts} lot${parts > 1 ? 's' : ''}` : ''}</span>
                        <span className="inline-flex items-center gap-1 group-hover:text-foreground">
                            Open
                            <ChevronRight className="h-4 w-4" />
                        </span>
                    </CardFooter>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive z-10"
                    onClick={handleDelete}
                    title="Delete auction"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </Card>
        </div>
    );
}

/* -------- Create New Card -------- */
function CreateNewCard() {
    return (
        <Link href="/admin/auctions/new" className="group block h-full no-underline text-current">
            <Card className="@container/card h-full flex flex-col bg-black text-white border border-black transition-all hover:-translate-y-0.5 hover:shadow-xs">
                <CardHeader className="flex flex-1 flex-row items-center gap-4">
                    <div className="rounded-full ring-1 ring-white/25 p-3 transition-colors group-hover:bg-white/5">
                        <Plus className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle>Create new</CardTitle>
                        <CardDescription className="text-white/70">Start a new auction</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        </Link>
    );
}

/* -------- Grid wrapper -------- */
export function AuctionCards({ auctions }: { auctions: Auction[] }) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {auctions.map((a) => (
                <AuctionCard key={a.id} auction={a} />
            ))}
            <CreateNewCard />
        </div>
    );
}
