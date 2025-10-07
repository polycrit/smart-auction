'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuction } from '@/hooks/useAuction';
import type { AuctionStatus, Lot } from '@/types/auction';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

    const live = auctionStatus === 'live' && lot.status === 'live';
    const canBid = live && connected && amount.trim().length > 0;

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
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base sm:text-lg">
                            #{lot.lot_number} — {lot.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Status: <span className="capitalize">{lot.status}</span>
                        </CardDescription>
                    </div>
                    <Badge variant={live ? 'default' : 'outline'}>{live ? 'Bidding Open' : 'Not Live'}</Badge>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                            <Label htmlFor={`amount-${lot.id}`}>Your bid</Label>
                            <div className="mt-1 flex gap-2">
                                <Input
                                    id={`amount-${lot.id}`}
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={suggested}
                                    disabled={!live || !connected}
                                />
                                <Button type="button" variant="secondary" onClick={() => setAmount(suggested)} disabled={!live || !connected}>
                                    Set {formatMoney(suggested, lot.currency)}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <Button type="button" variant="outline" onClick={() => nudge(minInc)} disabled={!live || !connected}>
                                +{formatMoney(lot.min_increment, lot.currency)}
                            </Button>
                            <Button type="submit" disabled={!canBid}>
                                Place bid
                            </Button>
                        </div>
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

    const meta = STATUS_META[status ?? 'draft'];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">{auction?.title ?? 'Loading…'}</h1>
                    <p className="text-muted-foreground">{auction?.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant={connected ? 'default' : 'outline'}>{connected ? 'Connected' : 'Offline'}</Badge>
                        {auction?.slug && (
                            <span className="text-xs text-muted-foreground">
                                Join URL: <code className="rounded bg-muted px-2 py-0.5">/a/{auction.slug}</code>
                            </span>
                        )}
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

            {/* Content */}
            <Tabs defaultValue="lots" className="w-full">
                <TabsList>
                    <TabsTrigger value="lots">Lots</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>

                <TabsContent value="lots" className="mt-4">
                    {lots.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No lots yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {lots.map((lot: Lot) => (
                                <LotCard key={lot.id} lot={lot} auctionStatus={status} connected={connected} placeBid={placeBid} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="about" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>About this auction</CardTitle>
                            <CardDescription>Details and schedule</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-md border p-3 text-sm">
                                <div className="text-muted-foreground">Status</div>
                                <div className="font-medium capitalize">{status ?? 'draft'}</div>
                            </div>
                            <div className="rounded-md border p-3 text-sm">
                                <div className="text-muted-foreground">Starts</div>
                                <div className="font-medium">{auction?.start_time ? new Date(auction.start_time).toLocaleString() : '—'}</div>
                            </div>
                            <div className="rounded-md border p-3 text-sm">
                                <div className="text-muted-foreground">Ends</div>
                                <div className="font-medium">{auction?.end_time ? new Date(auction.end_time).toLocaleString() : '—'}</div>
                            </div>
                            <div className="rounded-md border p-3 text-sm">
                                <div className="text-muted-foreground">Created</div>
                                <div className="font-medium">{auction?.created_at ? new Date(auction.created_at).toLocaleString() : '—'}</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
