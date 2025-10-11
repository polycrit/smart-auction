import { z } from 'zod';

// Vendor validation
export const vendorSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
    email: z.string().email('Invalid email address'),
    comment: z.string().optional().nullable(),
});

export type VendorFormData = z.infer<typeof vendorSchema>;

// Participant validation
export const participantSchema = z.object({
    vendor_id: z.string().uuid('Invalid vendor ID'),
});

export type ParticipantFormData = z.infer<typeof participantSchema>;

// Lot validation
export const lotSchema = z.object({
    name: z.string().min(1, 'Lot name is required').max(255, 'Name is too long'),
    base_price: z.coerce.number().min(0, 'Base price must be non-negative'),
    min_increment: z.coerce.number().min(0.01, 'Minimum increment must be positive'),
    currency: z.string().min(1, 'Currency is required').max(8, 'Currency code is too long'),
});

export type LotFormData = z.infer<typeof lotSchema>;

// Auction validation
export const auctionSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
    description: z.string().optional().nullable(),
    start_time: z.string().datetime().optional().nullable(),
    end_time: z.string().datetime().optional().nullable(),
}).refine(
    (data) => {
        if (data.start_time && data.end_time) {
            return new Date(data.end_time) > new Date(data.start_time);
        }
        return true;
    },
    {
        message: 'End time must be after start time',
        path: ['end_time'],
    }
);

export type AuctionFormData = z.infer<typeof auctionSchema>;
