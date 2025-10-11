'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useVendorQuery } from '@/hooks/queries/useVendorQuery';
import { useUpdateVendorMutation } from '@/hooks/mutations/useUpdateVendorMutation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { vendorSchema } from '@/lib/validations';

export default function EditVendorPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const vendorId = params.id;

    const { data: vendor, isLoading, isError, error: queryError } = useVendorQuery(vendorId);
    const updateVendorMutation = useUpdateVendorMutation(vendorId);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [comment, setComment] = useState('');
    const [error, setError] = useState<string>();

    // Set form values when vendor data loads
    useEffect(() => {
        if (vendor) {
            setName(vendor.name);
            setEmail(vendor.email);
            setComment(vendor.comment || '');
        }
    }, [vendor]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(undefined);

        // Validate with Zod
        const result = vendorSchema.safeParse({ name, email, comment: comment || null });

        if (!result.success) {
            setError(result.error.issues[0]?.message || 'Validation failed');
            return;
        }

        updateVendorMutation.mutate(result.data, {
            onSuccess: () => {
                router.push('/admin/vendors');
            },
            onError: (err: Error) => {
                setError(err.message || 'Failed to update vendor');
            },
        });
    }

    if (isLoading) {
        return (
            <Card className="w-100 mx-auto p-6">
                <CardContent className="py-12">
                    <LoadingSpinner />
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <div className="w-100 mx-auto p-6">
                <ErrorMessage message={queryError instanceof Error ? queryError.message : 'Failed to load vendor'} />
            </div>
        );
    }

    if (!vendor) {
        return null;
    }

    return (
        <Card className="w-100 mx-auto p-6">
            <CardHeader>
                <CardTitle>Edit Vendor</CardTitle>
                <CardDescription>Update vendor contact information</CardDescription>
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
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={updateVendorMutation.isPending}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!name || !email || updateVendorMutation.isPending}>
                        {updateVendorMutation.isPending ? 'Updating…' : 'Update Vendor'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
