import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type DashboardSummary, type AuctionAnalytics, type BidAnalytics, type RevenueAnalytics, type VendorAnalytics, type ParticipantAnalytics } from '@/lib/api/analytics';
import { analyticsKeys } from '@/lib/queryKeys';

export function useDashboardAnalytics() {
  return useQuery<DashboardSummary>({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => analyticsApi.getDashboard(),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
}

export function useAuctionAnalytics() {
  return useQuery<AuctionAnalytics>({
    queryKey: analyticsKeys.auctions(),
    queryFn: () => analyticsApi.getAuctions(),
    staleTime: 30_000,
  });
}

export function useBidAnalytics() {
  return useQuery<BidAnalytics>({
    queryKey: analyticsKeys.bids(),
    queryFn: () => analyticsApi.getBids(),
    staleTime: 30_000,
  });
}

export function useRevenueAnalytics() {
  return useQuery<RevenueAnalytics>({
    queryKey: analyticsKeys.revenue(),
    queryFn: () => analyticsApi.getRevenue(),
    staleTime: 30_000,
  });
}

export function useVendorAnalytics() {
  return useQuery<VendorAnalytics>({
    queryKey: analyticsKeys.vendors(),
    queryFn: () => analyticsApi.getVendors(),
    staleTime: 30_000,
  });
}

export function useParticipantAnalytics(auctionId: string) {
  return useQuery<ParticipantAnalytics>({
    queryKey: analyticsKeys.participants(auctionId),
    queryFn: () => analyticsApi.getParticipants(auctionId),
    staleTime: 30_000,
    enabled: !!auctionId,
  });
}
