import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorMessage({ title = 'Error', message, onRetry, className }: ErrorMessageProps) {
    return (
        <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4 text-red-800', className)} role="alert">
            <div className="flex flex-col gap-2">
                <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm mt-1">{message}</p>
                </div>
                {onRetry && (
                    <div>
                        <Button size="sm" variant="outline" onClick={onRetry}>
                            Try Again
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
