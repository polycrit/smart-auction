"""
Analytics service for generating auction platform statistics and insights.
"""
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy import func, select, and_, cast, Numeric
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Auction, Lot, Bid, Participant, Vendor


async def get_auction_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Get comprehensive auction statistics."""

    # Total auctions by status
    status_query = select(
        Auction.status,
        func.count(Auction.id).label('count')
    ).group_by(Auction.status)

    status_result = await db.execute(status_query)
    status_counts = {row.status: row.count for row in status_result}

    # Total auctions
    total_auctions = sum(status_counts.values())

    # Recent auctions (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_query = select(func.count(Auction.id)).where(
        Auction.created_at >= thirty_days_ago
    )
    recent_result = await db.execute(recent_query)
    recent_auctions = recent_result.scalar() or 0

    # Active auctions (live or paused)
    active_auctions = status_counts.get('live', 0) + status_counts.get('paused', 0)

    # Auctions with scheduled start times
    scheduled_query = select(func.count(Auction.id)).where(
        Auction.start_time.isnot(None)
    )
    scheduled_result = await db.execute(scheduled_query)
    scheduled_auctions = scheduled_result.scalar() or 0

    return {
        'total_auctions': total_auctions,
        'active_auctions': active_auctions,
        'recent_auctions': recent_auctions,
        'scheduled_auctions': scheduled_auctions,
        'by_status': {
            'draft': status_counts.get('draft', 0),
            'live': status_counts.get('live', 0),
            'paused': status_counts.get('paused', 0),
            'ended': status_counts.get('ended', 0),
        }
    }


async def get_bid_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Get comprehensive bidding statistics."""

    # Total bids
    total_bids_query = select(func.count(Bid.id))
    total_bids_result = await db.execute(total_bids_query)
    total_bids = total_bids_result.scalar() or 0

    # Recent bids (last 24 hours)
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    recent_bids_query = select(func.count(Bid.id)).where(
        Bid.placed_at >= twenty_four_hours_ago
    )
    recent_bids_result = await db.execute(recent_bids_query)
    recent_bids = recent_bids_result.scalar() or 0

    # Average bids per lot (requires subquery)
    bids_per_lot_subq = (
        select(func.count(Bid.id).label('bid_count'))
        .group_by(Bid.lot_id)
        .subquery()
    )
    avg_bids_query = select(func.avg(bids_per_lot_subq.c.bid_count))
    avg_bids_result = await db.execute(avg_bids_query)
    avg_bids_per_lot = float(avg_bids_result.scalar() or 0)

    # Total unique bidders
    unique_bidders_query = select(func.count(func.distinct(Bid.participant_id)))
    unique_bidders_result = await db.execute(unique_bidders_query)
    unique_bidders = unique_bidders_result.scalar() or 0

    # Bid activity over time (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    date_col = func.date_trunc('day', Bid.placed_at)
    daily_bids_query = select(
        date_col.label('date'),
        func.count(Bid.id).label('count')
    ).where(
        Bid.placed_at >= seven_days_ago
    ).group_by(
        date_col
    ).order_by(date_col)

    daily_bids_result = await db.execute(daily_bids_query)
    daily_bids = [
        {
            'date': row.date.isoformat() if row.date else None,
            'count': row.count
        }
        for row in daily_bids_result
    ]

    return {
        'total_bids': total_bids,
        'recent_bids_24h': recent_bids,
        'avg_bids_per_lot': round(avg_bids_per_lot, 2),
        'unique_bidders': unique_bidders,
        'daily_activity': daily_bids
    }


async def get_revenue_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Get financial analytics and revenue statistics."""

    # Current lot value (sum of current prices across all lots - potential value)
    current_value_query = select(
        func.sum(cast(Lot.current_price, Numeric)).label('total')
    )
    current_value_result = await db.execute(current_value_query)
    current_lot_value = float(current_value_result.scalar() or 0)

    # Realized revenue (only from ended auctions - actual revenue)
    realized_revenue_query = select(
        func.sum(cast(Lot.current_price, Numeric))
    ).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).where(
        Auction.status == 'ended'
    )
    realized_revenue_result = await db.execute(realized_revenue_query)
    realized_revenue = float(realized_revenue_result.scalar() or 0)

    # Revenue by currency (from ended auctions only)
    revenue_by_currency_query = select(
        Lot.currency,
        func.sum(cast(Lot.current_price, Numeric)).label('revenue')
    ).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).where(
        Auction.status == 'ended'
    ).group_by(Lot.currency)

    revenue_by_currency_result = await db.execute(revenue_by_currency_query)
    revenue_by_currency = {
        row.currency: float(row.revenue or 0)
        for row in revenue_by_currency_result
    }

    # Total lots
    total_lots_query = select(func.count(Lot.id))
    total_lots_result = await db.execute(total_lots_query)
    total_lots = total_lots_result.scalar() or 0

    # Total lots with bids
    lots_with_bids_query = select(
        func.count(func.distinct(Lot.id))
    ).select_from(Lot).join(Bid, Lot.id == Bid.lot_id)
    lots_with_bids_result = await db.execute(lots_with_bids_query)
    lots_with_bids = lots_with_bids_result.scalar() or 0

    # Ended lots total
    ended_lots_query = select(func.count(Lot.id)).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).where(Auction.status == 'ended')
    ended_lots_result = await db.execute(ended_lots_query)
    ended_lots = ended_lots_result.scalar() or 0

    # Ended lots with bids (for conversion rate)
    ended_lots_with_bids_query = select(
        func.count(func.distinct(Lot.id))
    ).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).join(
        Bid, Lot.id == Bid.lot_id
    ).where(Auction.status == 'ended')
    ended_lots_with_bids_result = await db.execute(ended_lots_with_bids_query)
    ended_lots_with_bids = ended_lots_with_bids_result.scalar() or 0

    # Conversion rate (% of ended lots that received bids)
    conversion_rate = (ended_lots_with_bids / ended_lots * 100) if ended_lots > 0 else 0

    # Average winning premium (how much above base price lots sold for, in %)
    # Only for ended lots with bids
    premium_query = select(
        func.avg(
            (cast(Lot.current_price, Numeric) - cast(Lot.base_price, Numeric))
            / cast(Lot.base_price, Numeric) * 100
        )
    ).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).where(
        and_(
            Auction.status == 'ended',
            Lot.current_price > Lot.base_price
        )
    )
    premium_result = await db.execute(premium_query)
    avg_winning_premium = float(premium_result.scalar() or 0)

    # Average lot price (from ended auctions)
    avg_price_query = select(
        func.avg(cast(Lot.current_price, Numeric))
    ).select_from(Lot).join(
        Auction, Lot.auction_id == Auction.id
    ).where(Auction.status == 'ended')
    avg_price_result = await db.execute(avg_price_query)
    avg_lot_price = float(avg_price_result.scalar() or 0)

    return {
        'realized_revenue': round(realized_revenue, 2),
        'current_lot_value': round(current_lot_value, 2),
        'avg_lot_price': round(avg_lot_price, 2),
        'total_lots': total_lots,
        'ended_lots': ended_lots,
        'lots_with_bids': lots_with_bids,
        'conversion_rate': round(conversion_rate, 2),
        'avg_winning_premium': round(avg_winning_premium, 2),
        'by_currency': revenue_by_currency
    }


async def get_vendor_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Get vendor participation and performance statistics."""

    # Total registered vendors
    total_vendors_query = select(func.count(Vendor.id))
    total_vendors_result = await db.execute(total_vendors_query)
    total_vendors = total_vendors_result.scalar() or 0

    # Vendors who have participated in at least one auction
    participating_vendors_query = select(
        func.count(func.distinct(Participant.vendor_id))
    )
    participating_vendors_result = await db.execute(participating_vendors_query)
    participating_vendors = participating_vendors_result.scalar() or 0

    # Vendors who have placed at least one bid
    bidding_vendors_query = select(
        func.count(func.distinct(Participant.vendor_id))
    ).select_from(Participant).join(
        Bid, Participant.id == Bid.participant_id
    )
    bidding_vendors_result = await db.execute(bidding_vendors_query)
    bidding_vendors = bidding_vendors_result.scalar() or 0

    # Total participations (a vendor can participate in multiple auctions)
    total_participations_query = select(func.count(Participant.id))
    total_participations_result = await db.execute(total_participations_query)
    total_participations = total_participations_result.scalar() or 0

    # Blocked participations
    blocked_participations_query = select(
        func.count(Participant.id)
    ).where(Participant.blocked == True)
    blocked_participations_result = await db.execute(blocked_participations_query)
    blocked_participations = blocked_participations_result.scalar() or 0

    # Vendors currently leading lots
    leading_vendors_query = select(
        func.count(func.distinct(Participant.vendor_id))
    ).select_from(Participant).join(
        Lot, Participant.id == Lot.current_leader
    )
    leading_vendors_result = await db.execute(leading_vendors_query)
    leading_vendors = leading_vendors_result.scalar() or 0

    # Top participating vendors (by number of auctions + bid count)
    top_vendors_query = select(
        Vendor.id,
        Vendor.name,
        Vendor.email,
        func.count(func.distinct(Participant.id)).label('auction_count'),
        func.count(Bid.id).label('bid_count')
    ).select_from(Vendor).join(
        Participant, Vendor.id == Participant.vendor_id
    ).outerjoin(
        Bid, Participant.id == Bid.participant_id
    ).group_by(
        Vendor.id, Vendor.name, Vendor.email
    ).order_by(
        func.count(Bid.id).desc()
    ).limit(10)

    top_vendors_result = await db.execute(top_vendors_query)
    top_vendors = [
        {
            'id': str(row.id),
            'name': row.name,
            'email': row.email,
            'auction_count': row.auction_count,
            'bid_count': row.bid_count
        }
        for row in top_vendors_result
    ]

    return {
        'total_vendors': total_vendors,
        'participating_vendors': participating_vendors,
        'bidding_vendors': bidding_vendors,
        'total_participations': total_participations,
        'blocked_participations': blocked_participations,
        'leading_vendors': leading_vendors,
        'top_vendors': top_vendors
    }


async def get_participant_analytics(
    auction_id: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """Get analytics for participants in a specific auction."""

    # Total participants
    total_query = select(func.count(Participant.id)).where(
        Participant.auction_id == auction_id
    )
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    # Active vs blocked
    active_query = select(func.count(Participant.id)).where(
        and_(
            Participant.auction_id == auction_id,
            Participant.blocked == False
        )
    )
    active_result = await db.execute(active_query)
    active = active_result.scalar() or 0

    # Participants with bids
    with_bids_query = select(
        func.count(func.distinct(Bid.participant_id))
    ).select_from(Bid).join(
        Lot, Bid.lot_id == Lot.id
    ).where(
        Lot.auction_id == auction_id
    )
    with_bids_result = await db.execute(with_bids_query)
    with_bids = with_bids_result.scalar() or 0

    # Current leaders
    leaders_query = select(
        func.count(func.distinct(Lot.current_leader))
    ).where(
        and_(
            Lot.auction_id == auction_id,
            Lot.current_leader.isnot(None)
        )
    )
    leaders_result = await db.execute(leaders_query)
    current_leaders = leaders_result.scalar() or 0

    return {
        'total_participants': total,
        'active_participants': active,
        'blocked_participants': total - active,
        'participants_with_bids': with_bids,
        'current_leaders': current_leaders,
        'engagement_rate': round((with_bids / total * 100) if total > 0 else 0, 2)
    }


async def get_dashboard_summary(db: AsyncSession) -> Dict[str, Any]:
    """Get comprehensive dashboard summary with all key metrics."""

    auction_stats = await get_auction_analytics(db)
    bid_stats = await get_bid_analytics(db)
    revenue_stats = await get_revenue_analytics(db)
    vendor_stats = await get_vendor_analytics(db)

    return {
        'auctions': auction_stats,
        'bids': bid_stats,
        'revenue': revenue_stats,
        'vendors': vendor_stats,
        'generated_at': datetime.utcnow().isoformat()
    }
