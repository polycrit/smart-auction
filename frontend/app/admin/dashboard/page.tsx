'use client';

import { IconTrendingUp, IconGavel, IconCoin, IconUsers, IconChartBar } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useDashboardAnalytics } from '@/hooks/queries/useAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function Page() {
    const { data: analytics, isLoading, error } = useDashboardAnalytics();

    if (isLoading) {
        return (
            <>
                <PageHeader text="Dashboard" subtext="Quick overview of your auction platform" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-muted-foreground">Loading dashboard...</div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <PageHeader text="Dashboard" subtext="Quick overview of your auction platform" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-red-600">Failed to load dashboard data. Please try again.</div>
                </div>
            </>
        );
    }

    if (!analytics) return null;

    // Get primary currency for formatting
    const primaryCurrency = Object.keys(analytics.revenue?.by_currency ?? {})[0] || 'EUR';

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: primaryCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const bidActivityData = (analytics.bids?.daily_activity ?? []).map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        bids: item.count,
    }));

    return (
        <>
            <PageHeader text="Dashboard" subtext="Quick overview of your auction platform" />

            {/* KPI Cards */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-6">
                {/* Realized Revenue */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Realized Revenue</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(analytics.revenue.realized_revenue)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconCoin className="size-3.5" />
                                {analytics.revenue.conversion_rate}% conv.
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            From {analytics.revenue.ended_lots} ended lots
                        </div>
                        <div className="text-muted-foreground">
                            {formatCurrency(analytics.revenue.avg_lot_price)} avg per lot
                        </div>
                    </CardFooter>
                </Card>

                {/* Active Auctions */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Active Auctions</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.auctions.active_auctions}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconGavel className="size-3.5" />
                                {analytics.auctions.total_auctions} total
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.auctions.by_status.live} live, {analytics.auctions.by_status.paused} paused
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.auctions.by_status.ended} ended
                        </div>
                    </CardFooter>
                </Card>

                {/* Today's Activity */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Bids (24h)</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.bids.recent_bids_24h}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconChartBar className="size-3.5" />
                                {analytics.bids.total_bids.toLocaleString()} total
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.bids.unique_bidders} unique bidders
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.bids.avg_bids_per_lot.toFixed(1)} avg per lot
                        </div>
                    </CardFooter>
                </Card>

                {/* Vendors */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Active Vendors</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.vendors.bidding_vendors}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconUsers className="size-3.5" />
                                {analytics.vendors.total_vendors} registered
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.vendors.leading_vendors} leading lots
                            {analytics.vendors.leading_vendors > 0 && <IconTrendingUp className="size-4 text-green-600" />}
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.vendors.participating_vendors} in auctions
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Bid Activity Chart */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Bid Activity (7 Days)</CardTitle>
                    <CardDescription>Daily bidding activity trend</CardDescription>
                </CardHeader>
                <CardContent>
                    {bidActivityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={bidActivityData}>
                                <defs>
                                    <linearGradient id="colorBidsDash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="bids"
                                    stroke="#8884d8"
                                    fillOpacity={1}
                                    fill="url(#colorBidsDash)"
                                    name="Bids"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No bid activity in the last 7 days
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="flex gap-4">
                <Link href="/admin/analytics" className="text-sm text-primary hover:underline">
                    View detailed analytics →
                </Link>
                <Link href="/admin/auctions" className="text-sm text-primary hover:underline">
                    Manage auctions →
                </Link>
            </div>
        </>
    );
}
