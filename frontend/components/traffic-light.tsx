import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TrafficLightStatus = 'green' | 'yellow' | 'red';

interface TrafficLightProps {
    status: TrafficLightStatus;
    className?: string;
}

const trafficConfig = {
    green: {
        label: 'Good',
        className: 'bg-traffic-green text-white border-traffic-green',
    },
    yellow: {
        label: 'Review',
        className: 'bg-traffic-yellow text-black border-traffic-yellow',
    },
    red: {
        label: 'Issue',
        className: 'bg-traffic-red text-white border-traffic-red',
    },
};

export function TrafficLight({ status, className }: TrafficLightProps) {
    const config = trafficConfig[status];

    return (
        <Badge variant="outline" className={cn(config.className, 'font-semibold', className)}>
            {config.label}
        </Badge>
    );
}
