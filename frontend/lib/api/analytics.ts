import { adminClient } from './client';

export interface AuctionAnalytics {
  total_auctions: number;
  active_auctions: number;
  recent_auctions: number;
  scheduled_auctions: number;
  by_status: {
    draft: number;
    live: number;
    paused: number;
    ended: number;
  };
}

export interface BidActivityData {
  date: string | null;
  count: number;
}

export interface BidAnalytics {
  total_bids: number;
  recent_bids_24h: number;
  avg_bids_per_lot: number;
  unique_bidders: number;
  daily_activity: BidActivityData[];
}

export interface RevenueAnalytics {
  realized_revenue: number;
  current_lot_value: number;
  avg_lot_price: number;
  total_lots: number;
  ended_lots: number;
  lots_with_bids: number;
  conversion_rate: number;
  avg_winning_premium: number;
  by_currency: Record<string, number>;
}

export interface TopVendor {
  id: string;
  name: string;
  email: string;
  auction_count: number;
  bid_count: number;
}

export interface VendorAnalytics {
  total_vendors: number;
  participating_vendors: number;
  bidding_vendors: number;
  total_participations: number;
  blocked_participations: number;
  leading_vendors: number;
  top_vendors: TopVendor[];
}

export interface ParticipantAnalytics {
  total_participants: number;
  active_participants: number;
  blocked_participants: number;
  participants_with_bids: number;
  current_leaders: number;
  engagement_rate: number;
}

export interface DashboardSummary {
  auctions: AuctionAnalytics;
  bids: BidAnalytics;
  revenue: RevenueAnalytics;
  vendors: VendorAnalytics;
  generated_at: string;
}

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardSummary> => {
    const { data } = await adminClient.get<DashboardSummary>('/analytics/dashboard');
    return data;
  },

  getAuctions: async (): Promise<AuctionAnalytics> => {
    const { data } = await adminClient.get<AuctionAnalytics>('/analytics/auctions');
    return data;
  },

  getBids: async (): Promise<BidAnalytics> => {
    const { data} = await adminClient.get<BidAnalytics>('/analytics/bids');
    return data;
  },

  getRevenue: async (): Promise<RevenueAnalytics> => {
    const { data } = await adminClient.get<RevenueAnalytics>('/analytics/revenue');
    return data;
  },

  getVendors: async (): Promise<VendorAnalytics> => {
    const { data } = await adminClient.get<VendorAnalytics>('/analytics/vendors');
    return data;
  },

  getParticipants: async (auctionId: string): Promise<ParticipantAnalytics> => {
    const { data } = await adminClient.get<ParticipantAnalytics>(
      `/analytics/auctions/${auctionId}/participants`
    );
    return data;
  },
};
