'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useCreateVendorMutation } from '@/hooks/mutations/useCreateVendorMutation';
import { vendorSchema } from '@/lib/validations';

function NewVendorForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [comment, setComment] = useState('');
    const [error, setError] = useState<string>();

    const createVendorMutation = useCreateVendorMutation();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(undefined);

        // Validate with Zod
        const result = vendorSchema.safeParse({ name, email, comment: comment || null });

        if (!result.success) {
            setError(result.error.issues[0]?.message || 'Validation failed');
            return;
        }

        createVendorMutation.mutate(result.data, {
            onSuccess: () => {
                // Navigate back to returnTo or vendors list
                if (returnTo) {
                    router.push(returnTo);
                } else {
                    router.push('/admin/vendors');
                }
            },
            onError: (err: Error) => {
                setError(err.message || 'Failed to create vendor');
            },
        });
    }

    return (
        <Card className="w-100 mx-auto p-6">
            <CardHeader>
                <CardTitle>Create a New Vendor</CardTitle>
                <CardDescription>Add vendor contact information</CardDescription>
            </CardHeader>
            <form onSubmit={onSubmit}>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input id="name" placeholder="e.g., John's Company" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="e.g., contact@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="comment">Comment</Label>
                        <Textarea
                            id="comment"
                            placeholder="Optional notes about this vendor"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">{error}</div>}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => (returnTo ? router.push(returnTo) : router.back())}
                        disabled={createVendorMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!name || !email || createVendorMutation.isPending}>
                        {createVendorMutation.isPending ? 'Creating…' : 'Create Vendor'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function NewVendorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewVendorForm />
        </Suspense>
    );
}
