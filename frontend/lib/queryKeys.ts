export const auctionsKeys = {
    all: ['auctions'] as const,
    list: () => [...auctionsKeys.all, 'list'] as const,
    bySlug: (slug: string) => [...auctionsKeys.all, 'by-slug', slug] as const,
};

export const vendorsKeys = {
    all: ['vendors'] as const,
    list: () => [...vendorsKeys.all, 'list'] as const,
    detail: (id: string) => [...vendorsKeys.all, 'detail', id] as const,
};

export const participantsKeys = {
    all: ['participants'] as const,
    byAuction: (slug: string) => [...participantsKeys.all, 'auction', slug] as const,
};

export const lotsKeys = {
    all: ['lots'] as const,
    byAuction: (slug: string) => [...lotsKeys.all, 'auction', slug] as const,
};
