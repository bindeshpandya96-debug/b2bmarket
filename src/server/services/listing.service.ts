/**
 * Listing service: business logic for listings.
 * - Only ACTIVE listings visible in marketplace; expired auto-hidden.
 * - quantity_available = 0 → SOLD_OUT. Sellers can set INACTIVE.
 * - Delegates DB access to listing.repository.
 */

import type { ListingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { listingRepository } from '@/server/repositories/listing.repository';
import type { SearchListingsParams, MyListingsParams } from '@/server/repositories/listing.repository';

const ACTIVE: ListingStatus = 'ACTIVE';
const SOLD_OUT: ListingStatus = 'SOLD_OUT';
const INACTIVE: ListingStatus = 'INACTIVE';

export type CreateListingInput = {
  hospitalId: string;
  title: string;
  description?: string | null;
  category: string;
  quantityAvailable: number;
  pricePerUnit: number;
  expiryDate?: string | null; // ISO date
};

export type UpdateListingInput = {
  title?: string;
  description?: string | null;
  category?: string;
  quantityAvailable?: number;
  pricePerUnit?: number;
  expiryDate?: string | null;
  status?: ListingStatus; // INACTIVE to deactivate
};

/** Marketplace search: only ACTIVE, not expired. */
export async function searchListings(params: SearchListingsParams) {
  const expiryAfter = params.expiryAfter ?? new Date();
  return listingRepository.findManySearch({
    ...params,
    expiryAfter,
  });
}

/** Get single listing for marketplace; returns null if not ACTIVE or expired. */
export async function getListingForMarketplace(id: string) {
  const listing = await listingRepository.findById(id);
  if (!listing || listing.status !== ACTIVE) return null;
  if (listing.expiryDate && listing.expiryDate < new Date()) return null;
  return listing;
}

/** Get by id (for seller's own edit page); no status/expiry filter. */
export async function getListingById(id: string) {
  return listingRepository.findById(id);
}

/** My listings (hospital dashboard): filter by title, category, status. */
export async function getMyListings(params: MyListingsParams) {
  return listingRepository.findManyByHospital(params);
}

async function ensureCategoryExists(name: string): Promise<void> {
  const trimmed = name.trim();
  const exists = await prisma.category.findUnique({ where: { name: trimmed } });
  if (!exists) {
    throw new Error(`Category "${trimmed}" is not valid. Please select a category from the list.`);
  }
}

export async function createListing(input: CreateListingInput) {
  await ensureCategoryExists(input.category);
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;
  const status: ListingStatus = ACTIVE;
  return listingRepository.create({
    hospitalId: input.hospitalId,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    category: input.category.trim(),
    quantityAvailable: Math.max(0, Math.floor(input.quantityAvailable)),
    pricePerUnit: input.pricePerUnit,
    expiryDate,
    status,
  });
}

export async function updateListing(
  id: string,
  input: UpdateListingInput,
  hospitalId: string // tenant check: only seller can update
) {
  const existing = await listingRepository.findById(id);
  if (!existing) return null;
  if (existing.hospitalId !== hospitalId) return null;

  const categoryToUse = input.category?.trim() ?? existing.category;
  if (categoryToUse) await ensureCategoryExists(categoryToUse);

  const quantityAvailable =
    input.quantityAvailable != null
      ? Math.max(0, Math.floor(input.quantityAvailable))
      : existing.quantityAvailable;
  const newStatus: ListingStatus =
    quantityAvailable === 0 ? SOLD_OUT : (input.status ?? existing.status);
  // If explicitly set to INACTIVE, use that
  const status = input.status === INACTIVE ? INACTIVE : newStatus;

  return listingRepository.update(id, {
    title: input.title?.trim(),
    description: input.description !== undefined ? input.description?.trim() ?? null : undefined,
    category: input.category?.trim(),
    quantityAvailable,
    pricePerUnit: input.pricePerUnit,
    expiryDate: input.expiryDate !== undefined ? (input.expiryDate ? new Date(input.expiryDate) : null) : undefined,
    status,
  });
}

/** Deactivate listing (seller only). */
export async function deactivateListing(id: string, hospitalId: string) {
  return updateListing(id, { status: INACTIVE }, hospitalId);
}

export const listingService = {
  searchListings,
  getListingForMarketplace,
  getListingById,
  getMyListings,
  createListing,
  updateListing,
  deactivateListing,
};
