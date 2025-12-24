'use client';

import { IconTrendingUp, IconUsers, IconGavel, IconCoin, IconChartBar, IconPercentage } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { useDashboardAnalytics } from '@/hooks/queries/useAnalytics';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    ].filter(item => item.value > 0);

    const bidActivityData = analytics.bids.daily_activity.map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
        bids: item.count,
    }));

    const currencyData = Object.entries(analytics.revenue.by_currency).map(([currency, amount]) => ({
        currency,
        amount,
    }));

    // Get primary currency for formatting (use first currency or default to EUR)
    const primaryCurrency = Object.keys(analytics.revenue.by_currency)[0] || 'EUR';

    const formatCurrency = (value: number, currency: string = primaryCurrency) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <>
            <PageHeader text="Analytics" subtext="Comprehensive auction platform metrics and insights" />

            {/* KPI Cards - Row 1: Revenue & Auctions */}
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
                                {analytics.revenue.ended_lots} ended
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {formatCurrency(analytics.revenue.avg_lot_price)} avg per lot
                        </div>
                        <div className="text-muted-foreground">
                            From ended auctions only
                        </div>
                    </CardFooter>
                </Card>

                {/* Conversion Rate */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Conversion Rate</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.revenue.conversion_rate}%
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconPercentage className="size-3.5" />
                                {analytics.revenue.lots_with_bids} with bids
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            +{analytics.revenue.avg_winning_premium.toFixed(1)}% avg premium
                            {analytics.revenue.avg_winning_premium > 0 && <IconTrendingUp className="size-4 text-green-600" />}
                        </div>
                        <div className="text-muted-foreground">
                            Above base price
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
                            {analytics.auctions.by_status.ended} ended, {analytics.auctions.scheduled_auctions} scheduled
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
            </div>

            {/* KPI Cards - Row 2: Vendors */}
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-3 mb-6">
                {/* Total Vendors */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Registered Vendors</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.vendors.total_vendors}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconUsers className="size-3.5" />
                                {analytics.vendors.participating_vendors} participating
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {analytics.vendors.bidding_vendors} have placed bids
                        </div>
                        <div className="text-muted-foreground">
                            {analytics.vendors.total_participations} total participations
                        </div>
                    </CardFooter>
                </Card>

                {/* Active Participations */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Current Leaders</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {analytics.vendors.leading_vendors}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconTrendingUp className="size-3.5" />
                                vendors
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            Currently leading lots
                        </div>
                        <div className="text-muted-foreground">
                            In active auctions
                        </div>
                    </CardFooter>
                </Card>

                {/* Current Lot Value */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Current Lot Value</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {formatCurrency(analytics.revenue.current_lot_value)}
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
                            Potential value (all lots)
                        </div>
                        <div className="text-muted-foreground">
                            Including active auctions
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
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No auction data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bid Activity (Last 7 Days) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bid Activity</CardTitle>
                        <CardDescription>Daily bidding activity over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bidActivityData.length > 0 ? (
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
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                No bid activity in the last 7 days
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Currency & Top Vendors */}
            <div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2">
                {/* Revenue by Currency */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue by Currency</CardTitle>
                        <CardDescription>Realized revenue from ended auctions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currencyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={currencyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="currency" />
                                    <YAxis />
                                    <Tooltip formatter={(value, _, props) => formatCurrency(Number(value), props.payload.currency)} />
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
                        <CardTitle>Top Vendors by Bids</CardTitle>
                        <CardDescription>Most active vendors by bid count</CardDescription>
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
                                    <div className="flex gap-2">
                                        <Badge variant="secondary">{vendor.bid_count} bids</Badge>
                                        <Badge variant="outline">{vendor.auction_count} auctions</Badge>
                                    </div>
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
