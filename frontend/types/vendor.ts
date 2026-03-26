export type UUID = string;

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
