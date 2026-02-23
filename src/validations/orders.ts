import { z } from 'zod';

export const deliveryAddressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

export const createOrderSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1),
  deliveryAddress: deliveryAddressSchema.optional(),
});

export const createOrdersBatchSchema = z.object({
  items: z.array(z.object({ listingId: z.string().min(1), quantity: z.number().int().min(1) })),
  deliveryAddress: deliveryAddressSchema,
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type DeliveryAddressBody = z.infer<typeof deliveryAddressSchema>;
