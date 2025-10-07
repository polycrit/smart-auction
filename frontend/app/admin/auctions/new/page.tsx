'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

type CreateResponse = {
    id: string;
    slug: string;
    public_url?: string;
    admin_ws_url?: string;
};

function toISOOrNull(v: string): string | null {
    const trimmed = v?.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function NewAuctionPage() {
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startAt, setStartAt] = useState(''); // HTML datetime-local value
    const [endAt, setEndAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>();
    const [preview, setPreview] = useState<CreateResponse | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(undefined);

        const startISO = toISOOrNull(startAt);
        const endISO = toISOOrNull(endAt);
        if (startISO && endISO && new Date(endISO) <= new Date(startISO)) {
            setError('End time must be after start time.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title,
                description: description || null,
                start_time: startISO,
                end_time: endISO,
            };
            const res = (await adminPost('auctions', payload)) as CreateResponse;
            setPreview(res);

            // Navigate to the admin page for this auction
            // Adjust if your route differs (e.g., `/admin/${res.slug}/setup`)
            router.push(`/admin/${res.slug}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create auction';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create a new auction</CardTitle>
                    <CardDescription>Set a title, optional description and schedule.</CardDescription>
                </CardHeader>
                <form onSubmit={onSubmit}>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input id="title" placeholder="e.g., HV Wiring Set" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Optional details visible to participants"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="start">Start time</Label>
                                <Input id="start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">End time</Label>
                                <Input id="end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                            </div>
                        </div>

                        {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">{error}</div>}

                        {preview && (
                            <div className="text-xs text-muted-foreground border rounded px-3 py-2">
                                <div>
                                    Slug: <b>{preview.slug}</b>
                                </div>
                                {preview.public_url && (
                                    <div>
                                        Public URL: <code>{preview.public_url}</code>
                                    </div>
                                )}
                                {preview.admin_ws_url && (
                                    <div>
                                        Admin WS: <code>{preview.admin_ws_url}</code>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!title || submitting}>
                            {submitting ? 'Creating…' : 'Create auction'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
