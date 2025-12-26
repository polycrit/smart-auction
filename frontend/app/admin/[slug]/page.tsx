'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuction } from '@/hooks/useAuction';
import { useVendorsQuery } from '@/hooks/queries/useVendorsQuery';
import { useParticipantsQuery } from '@/hooks/queries/useParticipantsQuery';
import { useAdminBidLog, type BidLogEntry } from '@/hooks/useAdminBidLog';
import { useCreateParticipantMutation } from '@/hooks/mutations/useCreateParticipantMutation';
import { useDeleteParticipantMutation } from '@/hooks/mutations/useDeleteParticipantMutation';
import { adminPost } from '@/lib/api';
import type { AuctionStatus, Lot } from '@/types/auction';
import type { Vendor } from '@/types/vendor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Trash2, Plus, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

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
    const [lotName, setLotName] = useState<string>('');
    const [basePrice, setBasePrice] = useState<string>('0');
    const [minInc, setMinInc] = useState<string>('1');
    const [currency, setCurrency] = useState<string>('EUR');
    const [imageUrl, setImageUrl] = useState<string>('');
    const [uploading, setUploading] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

    // create-participant form state
    const [selectedVendorId, setSelectedVendorId] = useState<string>('none');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Use React Query for data fetching
    const { data: participants = [] } = useParticipantsQuery(slug);
    const { data: vendors = [] } = useVendorsQuery();
    const { bids: bidLog, connected: bidLogConnected } = useAdminBidLog(slug);
    const createParticipantMutation = useCreateParticipantMutation(slug);
    const deleteParticipantMutation = useDeleteParticipantMutation(slug);

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

    const handleImageDelete = async () => {
        if (!imageUrl) return;

        setDeleting(true);
        try {
            const response = await fetch(`/api/admin/upload/image?url=${encodeURIComponent(imageUrl)}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Delete failed');
            }

            setImageUrl('');
            toast.success('Image deleted');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete image');
        } finally {
            setDeleting(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type. Use JPEG, PNG, GIF, or WebP');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large. Maximum size is 5MB');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/admin/upload/image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Upload failed');
            }

            const data = await response.json();
            setImageUrl(data.url);
            toast.success('Image uploaded');
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const onCreateLot = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        setErr(undefined);
        try {
            const payload = {
                name: lotName.trim(),
                base_price: basePrice,
                min_increment: minInc,
                currency,
                image_url: imageUrl || null,
            };
            await adminPost(`auctions/${slug}/lots`, payload);
            // reset form - the new lot will appear via WebSocket
            setLotName('');
            setBasePrice('0');
            setMinInc('1');
            setCurrency('EUR');
            setImageUrl('');
            toast.success('Lot created');
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Failed to create lot');
        } finally {
            setBusy(false);
        }
    };

    const onCreateParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Check if "create new" was selected
        if (selectedVendorId === 'create_new') {
            router.push(`/admin/vendors/new?returnTo=/admin/${slug}`);
            return;
        }

        // Check if no vendor selected
        if (selectedVendorId === 'none') {
            setErr('Please select a vendor');
            return;
        }

        setErr(undefined);
        createParticipantMutation.mutate(
            { vendor_id: selectedVendorId },
            {
                onSuccess: () => {
                    setSelectedVendorId('none');
                },
                onError: (error: Error) => {
                    setErr(error.message || 'Failed to create participant');
                },
            }
        );
    };

    const copyInviteLink = async (participant: { id: string; join_url: string }) => {
        const fullUrl = `${window.location.origin}${participant.join_url}`;
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopiedId(participant.id);
            toast.success('Link copied to clipboard');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const deleteParticipant = async (participantId: string) => {
        if (!confirm('Are you sure you want to delete this participant? This action cannot be undone.')) {
            return;
        }

        deleteParticipantMutation.mutate(participantId);
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
                    <div className="grid grid-cols-11 gap-2 text-sm font-medium text-muted-foreground px-2">
                        <div className="col-span-1">#</div>
                        <div className="col-span-6">Name</div>
                        <div className="col-span-2 text-right">Current</div>
                        <div className="col-span-2">Leader</div>
                    </div>
                    <div className="mt-2 space-y-1">
                        {lots.map((l: Lot) => (
                            <div key={l.id} className="grid grid-cols-11 gap-2 items-center rounded-md border p-2">
                                <div className="col-span-1">{l.lot_number}</div>
                                <div className="col-span-6 flex items-center gap-2">
                                    {l.image_url && <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                                    <span>{l.name}</span>
                                </div>
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
                    <form onSubmit={onCreateLot} className="w-full space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-10">
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
                                <Label>Cur</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="sm:col-span-1 flex items-end">
                                <Button type="submit" className="w-full" disabled={busy || uploading || !lotName}>
                                    Add
                                </Button>
                            </div>
                        </div>
                        {/* Image upload */}
                        <div className="flex flex-col items-start gap-3">
                            {imageUrl && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setLightboxOpen(true)}
                                        className="block h-24 w-24 rounded-lg overflow-hidden border-2 hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                                    >
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                                        onClick={handleImageDelete}
                                        disabled={deleting}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            <Label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 hover:bg-muted transition-colors">
                                {uploading ? (
                                    <span className="text-sm text-muted-foreground">Uploading...</span>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        <span className="text-sm">Upload Image</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </Label>
                        </div>
                    </form>
                </CardFooter>
            </Card>

            {/* Participants */}
            <Card>
                <CardHeader>
                    <CardTitle>Participants</CardTitle>
                    <CardDescription>Create participants and share invitation links</CardDescription>
                </CardHeader>
                <CardContent>
                    {participants.length === 0 ? (
                        <div className="text-sm text-muted-foreground px-2 py-3">No participants yet. Create the first one below.</div>
                    ) : (
                        <div className="space-y-2">
                            {participants.map((p: { id: string; join_url: string; vendor: { name: string; email: string } }) => (
                                <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div className="flex-1">
                                        <div className="font-medium">{p.vendor.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{p.vendor.email}</div>
                                        <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                                            {window.location.origin}
                                            {p.join_url}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => copyInviteLink(p)}>
                                            {copiedId === p.id ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy Link
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteParticipant(p.id)}
                                            className="hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* Create participant */}
                <CardFooter className="border-t mt-4 pt-4">
                    <form onSubmit={onCreateParticipant} className="w-full space-y-3">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <Label htmlFor="vendor_select">Select Vendor</Label>
                                <Select value={selectedVendorId} onValueChange={(value) => {
                                    if (value === 'create_new') {
                                        router.push(`/admin/vendors/new?returnTo=/admin/${slug}`);
                                    } else {
                                        setSelectedVendorId(value);
                                    }
                                }}>
                                    <SelectTrigger id="vendor_select" className="min-w-50">
                                        <SelectValue placeholder="Select vendor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors.map((vendor: Vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="create_new" className="text-primary">
                                            <div className="flex items-center">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create New Vendor
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" disabled={busy || selectedVendorId === 'none' || createParticipantMutation.isPending}>
                                {createParticipantMutation.isPending ? 'Adding...' : 'Add Participant'}
                            </Button>
                        </div>
                    </form>
                </CardFooter>
            </Card>

            {/* Bid Log */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Bid Log</CardTitle>
                            <CardDescription>Recent bidding activity</CardDescription>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs ${bidLogConnected ? 'text-emerald-600' : 'text-slate-500'}`}>
                            <span className={`h-2 w-2 rounded-full ${bidLogConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {bidLogConnected ? 'Live' : 'Connecting...'}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    {bidLog.length === 0 ? (
                        <div className="text-sm text-muted-foreground px-2 py-3">No bids yet.</div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {bidLog.map((bid: BidLogEntry) => (
                                <div key={bid.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {bid.vendor_name} bid on Lot #{bid.lot_number}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {bid.lot_name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {Number(bid.amount).toLocaleString()} {bid.currency}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(bid.placed_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image Lightbox */}
            {lightboxOpen && imageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <img
                        src={imageUrl}
                        alt="Full size preview"
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
