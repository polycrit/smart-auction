'use client';

import { IconTrendingUp, IconGavel, IconCoin, IconUsers } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useDashboardAnalytics } from '@/hooks/queries/useAnalytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Page() {
    const { data: analytics, isLoading, error } = useDashboardAnalytics();

    if (isLoading) {
        return (
            <>
                <PageHeader text="Dashboard" subtext="Relevant auction-related KPIs and charts" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-muted-foreground">Loading dashboard...</div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <PageHeader text="Dashboard" subtext="Relevant auction-related KPIs and charts" />
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-red-600">Failed to load dashboard data. Please try again.</div>
                </div>
            </>
        );
    }

    if (!analytics) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const bidActivityData = analytics.bids.daily_activity.map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        bids: item.count,
    }));

    return (
        <>
            <PageHeader text="Dashboard" subtext="Relevant auction-related KPIs and charts" />

            {/* KPI Cards */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 mb-6">
                {/* Total Revenue */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(analytics.revenue.total_revenue)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconTrendingUp className="size-3.5" />
                                {analytics.revenue.participation_rate}%
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.revenue.lots_with_bids} lots have bids <IconCoin className="size-4" />
                        </div>
                        <div className="text-muted-foreground">
                            {formatCurrency(analytics.revenue.avg_lot_price)} average per lot
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
                            {analytics.auctions.recent_auctions} created this month
                            {analytics.auctions.recent_auctions > 0 && <IconTrendingUp className="size-4" />}
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.auctions.by_status.live} live, {analytics.auctions.by_status.ended} ended
                        </div>
                    </CardFooter>
                </Card>

                {/* Total Bids */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Bids</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.bids.total_bids.toLocaleString()}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconTrendingUp className="size-3.5" />
                                {analytics.bids.recent_bids_24h} today
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.bids.avg_bids_per_lot.toFixed(1)} average per lot
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.bids.unique_bidders} unique bidders
                        </div>
                    </CardFooter>
                </Card>

                {/* Vendors */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Registered Vendors</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.vendors.total_vendors}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconUsers className="size-3.5" />
                                {analytics.vendors.active_participants} active
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.vendors.leading_vendors} currently leading
                        </div>
                        <div className="text-muted-foreground">
                            Engaged participants
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Bid Activity Chart */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Bid Activity</CardTitle>
                    <CardDescription>Daily bidding activity over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={bidActivityData}>
                            <defs>
                                <linearGradient id="colorBids" x1="0" y1="0" x2="0" y2="1">
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
                                fill="url(#colorBids)"
                                name="Bids"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Participating Vendors</CardTitle>
                    <CardDescription>Most active vendors by auction participation</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.vendors.top_vendors.slice(0, 5).map((vendor, index) => (
                            <div key={vendor.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium">{vendor.name}</div>
                                        <div className="text-sm text-muted-foreground">{vendor.email}</div>
                                    </div>
                                </div>
                                <Badge variant="secondary">{vendor.participation_count} auctions</Badge>
                            </div>
                        ))}
                        {analytics.vendors.top_vendors.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                No vendor participation data available yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
