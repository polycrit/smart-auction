export const auctionsKeys = {
    all: ['auctions'] as const,
    list: () => [...auctionsKeys.all, 'list'] as const,
    bySlug: (slug: string) => [...auctionsKeys.all, 'by-slug', slug] as const,
};
