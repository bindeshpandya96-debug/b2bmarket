/**
 * Listing repository: data access only. No business rules.
 * Used by listing.service for all DB reads/writes on listings.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ListingStatus } from '@prisma/client';

const LISTING_STATUS_ACTIVE: ListingStatus = 'ACTIVE';

export type SearchListingsParams = {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  hospitalId?: string; // Filter by seller organization
  excludeHospitalId?: string; // Exclude own hospital (marketplace for buyers)
  sort?: 'latest' | 'price_asc' | 'price_desc';
  expiryAfter?: Date; // Only show listings with expiry_date >= this (or null)
  page?: number;
  pageSize?: number;
};

export type MyListingsParams = {
  hospitalId: string;
  title?: string; // partial match
  category?: string;
  status?: ListingStatus;
  page?: number;
  pageSize?: number;
};

export type ListingForUpdate = {
  id: string;
  hospitalId: string;
  title: string;
  description: string | null;
  category: string;
  quantityAvailable: number;
  pricePerUnit: Prisma.Decimal;
  expiryDate: Date | null;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export const listingRepository = {
  /**
   * Search marketplace: only ACTIVE listings, optional filters, pagination.
   * Caller should pass expiryAfter = new Date() to hide expired.
   */
  async findManySearch(params: SearchListingsParams) {
    const { category, priceMin, priceMax, hospitalId, excludeHospitalId, sort = 'latest', expiryAfter, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ListingWhereInput = {
      status: LISTING_STATUS_ACTIVE,
    };
    if (category) where.category = category;
    if (excludeHospitalId) where.hospitalId = { not: excludeHospitalId };
    else if (hospitalId) where.hospitalId = hospitalId;
    if (priceMin != null || priceMax != null) {
      where.pricePerUnit = {
        ...(priceMin != null && { gte: priceMin }),
        ...(priceMax != null && { lte: priceMax }),
      } as Prisma.DecimalFilter;
    }
    if (expiryAfter != null) {
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gte: expiryAfter } },
      ];
    }

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === 'price_asc' ? { pricePerUnit: 'asc' } : sort === 'price_desc' ? { pricePerUnit: 'desc' } : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: { hospital: { select: { id: true, name: true } } },
      }),
      prisma.listing.count({ where }),
    ]);

    return { items, total, page, pageSize };
  },

  async findById(id: string) {
    return prisma.listing.findUnique({
      where: { id },
      include: { hospital: { select: { id: true, name: true } } },
    });
  },

  /** Listings by hospital (for seller dashboard) with optional filters. */
  async findManyByHospital(params: MyListingsParams) {
    const { hospitalId, title, category, status, page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;
    const where: Prisma.ListingWhereInput = { hospitalId };
    if (title?.trim()) {
      where.title = { contains: title.trim(), mode: 'insensitive' };
    }
    if (category?.trim()) where.category = category.trim();
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { hospital: { select: { id: true, name: true } } },
      }),
      prisma.listing.count({ where }),
    ]);
    return { items, total, page, pageSize };
  },

  /**
   * Lock listing row for update (use inside transaction). Returns null if not found.
   * Use with tx from prisma.$transaction(async (tx) => ...).
   */
  async findByIdForUpdate(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<ListingForUpdate | null> {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        hospital_id: string;
        title: string;
        description: string | null;
        category: string;
        quantity_available: number;
        price_per_unit: Prisma.Decimal;
        expiry_date: Date | null;
        status: string;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`SELECT id, hospital_id, title, description, category, quantity_available, price_per_unit, expiry_date, status, created_at, updated_at FROM listings WHERE id = ${id} FOR UPDATE`);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      hospitalId: r.hospital_id,
      title: r.title,
      description: r.description,
      category: r.category,
      quantityAvailable: r.quantity_available,
      pricePerUnit: r.price_per_unit,
      expiryDate: r.expiry_date,
      status: r.status as ListingStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  /**
   * Atomic: set quantity_available and optionally status (e.g. SOLD_OUT when 0).
   * Use inside transaction.
   */
  async updateQuantityAndStatus(
    tx: Prisma.TransactionClient,
    listingId: string,
    quantityAvailable: number,
    status: ListingStatus
  ) {
    return tx.listing.update({
      where: { id: listingId },
      data: { quantityAvailable, status, updatedAt: new Date() },
    });
  },

  async create(data: Prisma.ListingUncheckedCreateInput) {
    return prisma.listing.create({ data });
  },

  async update(id: string, data: Prisma.ListingUncheckedUpdateInput) {
    return prisma.listing.update({ where: { id }, data });
  },
};
