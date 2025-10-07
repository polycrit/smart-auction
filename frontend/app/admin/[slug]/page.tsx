'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api';
import { useAuction } from '@/hooks/useAuction';
import type { AuctionStatus, Lot } from '@/types/auction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
// If you have shadcn Table, uncomment these and the table markup below
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_META: Record<AuctionStatus, { label: string; dot: string }> = {
    draft: { label: 'Draft', dot: 'bg-slate-400' },
    live: { label: 'Live', dot: 'bg-emerald-500' },
    paused: { label: 'Paused', dot: 'bg-amber-500' },
    ended: { label: 'Ended', dot: 'bg-rose-500' },
};

function StatusIndicator({ status }: { status: AuctionStatus }) {
    const meta = STATUS_META[status];
    return (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
            {meta.label}
        </span>
    );
}

export default function AdminAuctionPage() {
    const router = useRouter();
    const params = useParams<{ slug: string }>();
    const slug = params.slug;

    const { auction, status, lots, connected, lastError } = useAuction(slug);
    const [busy, setBusy] = useState<boolean>(false);
    const [err, setErr] = useState<string | undefined>(undefined);

    // create-lot form state
    const [lotNumber, setLotNumber] = useState<string>('');
    const [lotName, setLotName] = useState<string>('');
    const [basePrice, setBasePrice] = useState<string>('0');
    const [minInc, setMinInc] = useState<string>('1');
    const [currency, setCurrency] = useState<string>('EUR');

    const changeStatus = async (next: AuctionStatus) => {
        setBusy(true);
        setErr(undefined);
        try {
            await adminPost(`auctions/${slug}/status`, { status: next });
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to change status');
        } finally {
            setBusy(false);
        }
    };

    const onCreateLot = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        setErr(undefined);
        try {
            const payload = {
                lot_number: Number(lotNumber),
                name: lotName.trim(),
                base_price: basePrice,
                min_increment: minInc,
                currency,
            };
            await adminPost(`auctions/${slug}/lots`, payload);
            // simplest: refresh the route to pick up the new lot (REST + socket snapshot on reconnect)
            router.refresh();
            // reset
            setLotNumber('');
            setLotName('');
            setBasePrice('0');
            setMinInc('1');
            setCurrency('EUR');
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to create lot');
        } finally {
            setBusy(false);
        }
    };

    const canStart = status === 'draft' || status === 'paused';
    const canPause = status === 'live';
    const canEnd = status === 'live' || status === 'paused';

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">{auction?.title ?? 'Loading…'}</h1>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <StatusIndicator status={status ?? 'draft'} />
                        <span className={`inline-flex items-center gap-1 ${connected ? 'text-emerald-600' : 'text-slate-500'}`}>
                            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {connected ? 'Realtime connected' : 'Realtime offline'}
                        </span>
                        {auction?.slug && <code className="rounded bg-muted px-2 py-0.5 text-xs">/a/{auction.slug}</code>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => router.refresh()} disabled={busy}>
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => changeStatus('live')} disabled={!canStart || busy}>
                        Start
                    </Button>
                    <Button size="sm" onClick={() => changeStatus('paused')} disabled={!canPause || busy} variant="secondary">
                        Pause
                    </Button>
                    <Button size="sm" onClick={() => changeStatus('ended')} disabled={!canEnd || busy} variant="destructive">
                        End
                    </Button>
                </div>
            </div>

            {(err || lastError) && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">{err ?? lastError}</div>}

            <Separator />

            {/* Lots */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Lots</CardTitle>
                        <CardDescription>Manage lots in this auction</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* If you have shadcn Table, use it; otherwise the responsive grid below works out of the box */}
                    {/* TABLE VERSION (uncomment if you have the Table component)
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Current price</TableHead>
                <TableHead>Leader</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.lot_number}</TableCell>
                  <TableCell>{l.name}</TableCell>
                  <TableCell className="capitalize">{l.status}</TableCell>
                  <TableCell className="text-right">
                    {l.current_price} {l.currency}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.current_leader ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          */}

                    {/* GRID VERSION (no extra deps) */}
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                        <div className="col-span-1">#</div>
                        <div className="col-span-5">Name</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Current</div>
                        <div className="col-span-2">Leader</div>
                    </div>
                    <div className="mt-2 space-y-1">
                        {lots.map((l: Lot) => (
                            <div key={l.id} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                                <div className="col-span-1">{l.lot_number}</div>
                                <div className="col-span-5">{l.name}</div>
                                <div className="col-span-2 capitalize">{l.status}</div>
                                <div className="col-span-2 text-right">
                                    {l.current_price} {l.currency}
                                </div>
                                <div className="col-span-2 truncate font-mono text-xs">{l.current_leader ?? '-'}</div>
                            </div>
                        ))}
                        {lots.length === 0 && <div className="text-sm text-muted-foreground px-2 py-3">No lots yet. Create the first one below.</div>}
                    </div>
                </CardContent>

                {/* Create lot */}
                <CardFooter className="border-t mt-4 pt-4">
                    <form onSubmit={onCreateLot} className="w-full grid grid-cols-1 gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-2">
                            <Label htmlFor="lot_number">Lot #</Label>
                            <Input
                                id="lot_number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={lotNumber}
                                onChange={(e) => setLotNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="sm:col-span-4">
                            <Label htmlFor="lot_name">Name</Label>
                            <Input
                                id="lot_name"
                                value={lotName}
                                onChange={(e) => setLotName(e.target.value)}
                                placeholder="e.g., HV Wiring Set"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="base_price">Base price</Label>
                            <Input id="base_price" inputMode="decimal" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="min_inc">Min increment</Label>
                            <Input id="min_inc" inputMode="decimal" value={minInc} onChange={(e) => setMinInc(e.target.value)} />
                        </div>
                        <div className="sm:col-span-1">
                            <Label htmlFor="currency">Cur</Label>
                            <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
                        </div>
                        <div className="sm:col-span-1 flex items-end">
                            <Button type="submit" className="w-full" disabled={busy || !lotNumber || !lotName}>
                                Add
                            </Button>
                        </div>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
