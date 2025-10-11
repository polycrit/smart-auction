// Domain primitives
export type UUID = string;

// Core entities
export type Vendor = {
    id: UUID;
    name: string;
    email: string;
    comment: string | null;
    created_at: string;
};

export type VendorCreate = {
    name: string;
    email: string;
    comment?: string | null;
};
