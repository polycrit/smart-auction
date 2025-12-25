'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuction } from '@/hooks/useAuction';
import type { AuctionStatus, Lot } from '@/types/auction';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STATUS_META: Record<AuctionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'outline' },
    live: { label: 'Live', variant: 'default' },
    paused: { label: 'Paused', variant: 'secondary' },
    ended: { label: 'Ended', variant: 'destructive' },
};

function formatMoney(amount: string, currency: string): string {
    const n = Number(amount);
    // fall back if currency is non-standard
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
    } catch {
        return `${n.toLocaleString()} ${currency}`;
    }
}

function TimeRemaining({ endISO }: { endISO: string | null }) {
    const [now, setNow] = useState<number>(() => Date.now());
    useEffect(() => {
        if (!endISO) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [endISO]);
    if (!endISO) return <span className="text-muted-foreground">—</span>;
    const end = new Date(endISO).getTime();
    const diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    const pad = (v: number) => v.toString().padStart(2, '0');
    return (
        <span className={diff === 0 ? 'text-rose-600 font-medium' : ''}>
            {h}:{pad(m)}:{pad(s)}
        </span>
    );
}

function LotCard({
    lot,
    auctionStatus,
    placeBid,
    connected,
}: {
    lot: Lot;
    auctionStatus: AuctionStatus | undefined;
    placeBid: (lotId: string, amount: string | number) => void;
    connected: boolean;
}) {
    const [amount, setAmount] = useState<string>('');
    const minInc = Number(lot.min_increment || '0');
    const current = Number(lot.current_price || '0');
    const suggested = useMemo(() => (current + (Number.isFinite(minInc) ? minInc : 0)).toFixed(2), [current, minInc]);

    const live = auctionStatus === 'live';
    const canBid = connected && amount.trim().length > 0;

    const nudge = (delta: number) => {
        const next = Number(amount || suggested) + delta;
        if (Number.isFinite(next)) setAmount(next.toFixed(2));
    };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!canBid) return;
        placeBid(lot.id, amount);
        // keep the amount so user can re-bid quickly; or uncomment to clear:
        // setAmount('');
    };

    return (
        <Card className="h-full">
            {lot.image_url && (
                <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                    <Image
                        src={lot.image_url}
                        alt={lot.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                    />
                </div>
            )}
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base sm:text-lg">
                            #{lot.lot_number} — {lot.name}
                        </CardTitle>
                    </div>
                    <Badge variant={live ? 'default' : 'outline'}>{live ? 'Bidding Open' : 'Auction Not Live'}</Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md bg-muted p-3">
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-semibold">{formatMoney(lot.current_price, lot.currency)}</div>
                    </div>
                    <div className="rounded-md bg-muted p-3">
                        <div className="text-muted-foreground">Min increment</div>
                        <div className="font-semibold">{formatMoney(lot.min_increment, lot.currency)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Leader</div>
                        <div className="font-mono text-xs truncate">{lot.current_leader ?? '—'}</div>
                    </div>
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Time remaining</div>
                        <div className="font-semibold">
                            <TimeRemaining endISO={lot.end_time} />
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-0">
                <form onSubmit={submit} className="w-full space-y-3">
                    <div>
                        <Label htmlFor={`amount-${lot.id}`}>Your bid</Label>
                        <div className="mt-1 flex gap-2">
                            <Input
                                id={`amount-${lot.id}`}
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder={suggested}
                                disabled={!connected}
                                className="flex-1"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setAmount(suggested)}
                                disabled={!connected}
                                className="whitespace-nowrap"
                            >
                                Set {formatMoney(suggested, lot.currency)}
                            </Button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => nudge(minInc)}
                            disabled={!connected}
                            className="flex-1 whitespace-nowrap"
                        >
                            +{formatMoney(lot.min_increment, lot.currency)}
                        </Button>
                        <Button type="submit" disabled={!canBid} className="flex-1">
                            Place bid
                        </Button>
                    </div>
                </form>
            </CardFooter>
        </Card>
    );
}

export default function ClientAuctionPage() {
    const params = useParams<{ slug: string }>();
    const searchParams = useSearchParams();
    const slug = params.slug;
    const inviteToken = searchParams.get('t') ?? undefined;

    const { auction, status, lots, connected, lastError, placeBid } = useAuction(slug, inviteToken);

    // Show waiting screen if auction is not live
    if (status && status !== 'live') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <CardTitle className="text-xl">
                            {auction?.title ?? 'Auction'}
                        </CardTitle>
                        {auction?.description && (
                            <CardDescription>{auction.description}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {status === 'ended' ? (
                            <>
                                <p className="text-lg font-medium">This auction has ended</p>
                                <p className="text-sm text-muted-foreground">
                                    Thank you for your participation.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-medium">Waiting for auction to start</p>
                                <p className="text-sm text-muted-foreground">
                                    Please wait for the auctioneer to start the auction. This page will update automatically.
                                </p>
                                {auction?.start_time && (
                                    <div className="mt-4 rounded-md bg-muted p-3">
                                        <div className="text-xs text-muted-foreground">Scheduled start</div>
                                        <div className="font-medium">{new Date(auction.start_time).toLocaleString()}</div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="justify-center">
                        <Badge variant={connected ? 'default' : 'outline'}>
                            {connected ? 'Connected - waiting for updates' : 'Connecting...'}
                        </Badge>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Loading state
    if (!auction) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-muted-foreground">Loading auction...</div>
            </div>
        );
    }

    const meta = STATUS_META[status ?? 'draft'];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">{auction.title}</h1>
                    <p className="text-muted-foreground">{auction.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant={connected ? 'default' : 'outline'}>{connected ? 'Connected' : 'Offline'}</Badge>
                    </div>
                </div>
            </div>

            {lastError && (
                <Alert variant="destructive">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{lastError}</AlertDescription>
                </Alert>
            )}

            <Separator />

            {/* Lots Grid */}
            {lots.length === 0 ? (
                <div className="text-sm text-muted-foreground">No lots available.</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {lots.map((lot: Lot) => (
                        <LotCard key={lot.id} lot={lot} auctionStatus={status} connected={connected} placeBid={placeBid} />
                    ))}
                </div>
            )}
        </div>
    );
}
