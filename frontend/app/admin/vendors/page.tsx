'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Vendor } from '@/types/vendor';
import { useVendorsQuery } from '@/hooks/queries/useVendorsQuery';
import { useDeleteVendorMutation } from '@/hooks/mutations/useDeleteVendorMutation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { PageHeader } from '@/components/ui/page-header';

export default function VendorsPage() {
    const router = useRouter();
    const { data: vendors, isLoading, isError, error, refetch } = useVendorsQuery();
    const deleteVendorMutation = useDeleteVendorMutation();

    const handleDelete = async (vendor: Vendor) => {
        if (!confirm(`Are you sure you want to delete "${vendor.name}"? This action cannot be undone.`)) {
            return;
        }

        deleteVendorMutation.mutate(vendor.id);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const truncate = (text: string | null, maxLength: number) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingSpinner className="py-12" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <ErrorMessage message={error instanceof Error ? error.message : 'Failed to load vendors'} onRetry={() => refetch()} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <PageHeader text="Vendors" subtext="Manage you vendor contacts" />
                <Link href="/admin/vendors/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Vendor
                    </Button>
                </Link>
            </div>

            {/* Vendors Grid */}
            {!vendors || vendors.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <p className="text-muted-foreground mb-4">No vendors yet. Create your first vendor to get started.</p>
                        <Link href="/admin/vendors/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Vendor
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vendors.map((vendor: Vendor) => (
                        <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg">{vendor.name}</CardTitle>
                                        <CardDescription className="truncate">{vendor.email}</CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                                            title="Edit vendor"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(vendor)}
                                            className="hover:bg-destructive/10 hover:text-destructive"
                                            title="Delete vendor"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {vendor.comment && <p className="text-sm text-muted-foreground">{truncate(vendor.comment, 100)}</p>}
                                <p className="text-xs text-muted-foreground">Created: {formatDate(vendor.created_at)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
