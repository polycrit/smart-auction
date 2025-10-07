import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AuctionStatus = 'upcoming' | 'active' | 'paused' | 'finished';

interface StatusBadgeProps {
    status: AuctionStatus;
    className?: string;
}

const statusConfig = {
    upcoming: {
        label: 'Upcoming',
        className: 'bg-status-upcoming text-white border-status-upcoming',
    },
    active: {
        label: 'Active',
        className: 'bg-status-active text-white border-status-active',
    },
    paused: {
        label: 'Paused',
        className: 'bg-status-paused text-black border-status-paused',
    },
    finished: {
        label: 'Finished',
        className: 'bg-status-finished text-white border-status-finished',
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge variant="outline" className={cn(config.className, className)}>
            {config.label}
        </Badge>
    );
}
