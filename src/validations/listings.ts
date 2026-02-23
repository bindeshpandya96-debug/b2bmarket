import { z } from 'zod';

export const createListingSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().min(1).max(100),
  quantityAvailable: z.number().int().min(0),
  pricePerUnit: z.number().min(0),
  expiryDate: z.string().optional().nullable(),
});

export const updateListingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().min(1).max(100).optional(),
  quantityAvailable: z.number().int().min(0).optional(),
  pricePerUnit: z.number().min(0).optional(),
  expiryDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'EXPIRED', 'INACTIVE']).optional(),
});

export const searchListingsQuerySchema = z.object({
  category: z.string().optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  hospitalId: z.string().optional(), // Filter by seller organization
  excludeHospitalId: z.string().optional(), // Exclude own hospital (marketplace for buyers)
  sort: z.enum(['latest', 'price_asc', 'price_desc']).optional(),
  expiryAfter: z.string().optional(), // ISO date
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateListingBody = z.infer<typeof createListingSchema>;
export type UpdateListingBody = z.infer<typeof updateListingSchema>;
export type SearchListingsQuery = z.infer<typeof searchListingsQuerySchema>;
