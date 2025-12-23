'use client';

import { IconTrendingUp, IconUsers, IconGavel, IconCoin, IconChartBar } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { us

eDashboardAnalytics } from '@/hooks/queries/useAnalytics';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
    const { data: analytics, isLoading, error } = useDashboardAnalytics();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-muted-foreground">Loading analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-600">Failed to load analytics. Please try again.</div>
            </div>
        );
    }

    if (!analytics) return null;

    // Prepare chart data
    const statusData = [
        { name: 'Draft', value: analytics.auctions.by_status.draft },
        { name: 'Live', value: analytics.auctions.by_status.live },
        { name: 'Paused', value: analytics.auctions.by_status.paused },
        { name: 'Ended', value: analytics.auctions.by_status.ended },
    ];

    const bidActivityData = analytics.bids.daily_activity.map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        bids: item.count,
    }));

    const currencyData = Object.entries(analytics.revenue.by_currency).map(([currency, amount]) => ({
        currency,
        amount,
    }));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <>
            <PageHeader text="Analytics" subtext="Comprehensive auction platform metrics and insights" />

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
                                <IconCoin className="size-3.5" />
                                {analytics.revenue.total_lots} lots
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.revenue.participation_rate}% participation rate
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.revenue.lots_with_bids} of {analytics.revenue.total_lots} lots with bids
                        </div>
                    </CardFooter>
                </Card>

                {/* Total Auctions */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Auctions</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.auctions.total_auctions}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconGavel className="size-3.5" />
                                {analytics.auctions.active_auctions} active
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.auctions.recent_auctions} created this month
                            {analytics.auctions.recent_auctions > 0 && <IconTrendingUp className="size-4" />}
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.auctions.scheduled_auctions} scheduled auctions
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
                                <IconChartBar className="size-3.5" />
                                {analytics.bids.recent_bids_24h} last 24h
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.bids.avg_bids_per_lot.toFixed(1)} avg per lot
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.bids.unique_bidders} unique bidders
                        </div>
                    </CardFooter>
                </Card>

                {/* Total Vendors */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Vendors</CardDescription>
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
                            {analytics.vendors.blocked_participants} blocked participants
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2 mb-6">
                {/* Auction Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Auction Status Distribution</CardTitle>
                        <CardDescription>Breakdown of auctions by status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Bid Activity (Last 7 Days) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bid Activity</CardTitle>
                        <CardDescription>Daily bidding activity over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
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
                                <Area type="monotone" dataKey="bids" stroke="#8884d8" fillOpacity={1} fill="url(#colorBids)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Currency & Top Vendors */}
            <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">
                {/* Revenue by Currency */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Currency</CardTitle>
                        <CardDescription>Total revenue breakdown by currency</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currencyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={currencyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="currency" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Bar dataKey="amount" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No revenue data available
                            </div>
                        )}
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
                            {analytics.vendors.top_vendors.slice(0, 8).map((vendor, index) => (
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
                                    No vendor participation data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
