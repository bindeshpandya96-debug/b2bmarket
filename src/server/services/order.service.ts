/**
 * Order service: business logic and transaction flow for orders.
 * - Initiate purchase: transaction + row lock + atomic stock deduction → RESERVED.
 * - Confirm / reject / cancel / expire: state transitions and stock restore when needed.
 * - Concurrency-safe; consistency over performance.
 */

import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/config';
import { listingRepository } from '@/server/repositories/listing.repository';
import { orderRepository } from '@/server/repositories/order.repository';
import { auditRepository } from '@/server/repositories/audit.repository';
import type { OrderStatus } from '@prisma/client';

const ACTIVE = 'ACTIVE';
const PENDING = 'PENDING';
const RESERVED = 'RESERVED';
const CONFIRMED = 'CONFIRMED';
const REJECTED = 'REJECTED';
const CANCELLED = 'CANCELLED';
const EXPIRED = 'EXPIRED';
const COMPLETED = 'COMPLETED';
const SOLD_OUT = 'SOLD_OUT';

export type DeliveryAddressSnapshot = {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
};

export type InitiatePurchaseInput = {
  listingId: string;
  quantity: number;
  buyerHospitalId: string;
  deliveryAddress?: DeliveryAddressSnapshot | null;
};

export type InitiatePurchaseResult =
  | { success: true; order: Awaited<ReturnType<typeof orderRepository.findById>> }
  | { success: false; error: string };

/**
 * Concurrency-safe purchase: lock listing row, validate, deduct stock, create order RESERVED.
 * Stock is deducted atomically; on any failure the transaction rolls back.
 */
export async function initiatePurchase(
  input: InitiatePurchaseInput,
  performedByUserId: string | null
): Promise<InitiatePurchaseResult> {
  const { listingId, quantity, buyerHospitalId, deliveryAddress } = input;
  const qty = Math.floor(quantity);
  if (qty < 1) return { success: false, error: 'Quantity must be at least 1' };

  const order = await prisma.$transaction(async (tx) => {
    const listing = await listingRepository.findByIdForUpdate(tx, listingId);
    if (!listing) return { error: 'Listing not found' };
    if (listing.status !== ACTIVE) return { error: 'Listing is not available for purchase' };
    const now = new Date();
    if (listing.expiryDate && listing.expiryDate < now) return { error: 'Listing has expired' };
    if (listing.quantityAvailable < qty) return { error: 'Insufficient quantity available' };
    if (listing.hospitalId === buyerHospitalId) return { error: 'Cannot purchase from your own hospital' };

    const newQuantity = listing.quantityAvailable - qty;
    const newStatus = newQuantity === 0 ? SOLD_OUT : listing.status;
    const pricePerUnit = Number(listing.pricePerUnit);
    const totalPrice = new Decimal(pricePerUnit * qty);

    await listingRepository.updateQuantityAndStatus(tx, listingId, newQuantity, newStatus);

    const reservedAt = new Date();
    const created = await orderRepository.create(tx, {
      buyerHospitalId,
      sellerHospitalId: listing.hospitalId,
      listingId,
      quantity: qty,
      totalPrice,
      status: RESERVED,
      reservedAt,
      deliveryAddress: deliveryAddress ?? undefined,
    });

    await auditRepository.append(
      {
        entityType: 'Order',
        entityId: created.id,
        action: 'created',
        performedBy: performedByUserId,
        metadata: { status: RESERVED, quantity: qty, totalPrice: totalPrice.toString() },
      },
      tx
    );
    await auditRepository.append(
      {
        entityType: 'Listing',
        entityId: listingId,
        action: 'quantity_updated',
        performedBy: performedByUserId,
        metadata: { previousQuantity: listing.quantityAvailable, newQuantity, newStatus },
      },
      tx
    );

    return { order: created };
  });

  if ('error' in order) return { success: false, error: order.error };

  const full = await orderRepository.findById(order.order.id);
  return { success: true, order: full! };
}

/** Seller confirms order (RESERVED → CONFIRMED). No stock change. */
export async function confirmOrder(
  orderId: string,
  sellerHospitalId: string,
  performedByUserId: string | null
) {
  const order = await orderRepository.findById(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status !== RESERVED) return { success: false, error: 'Order is not in RESERVED state' };
  if (order.sellerHospitalId !== sellerHospitalId) return { success: false, error: 'Not your order' };

  await orderRepository.updateStatus(orderId, CONFIRMED);
  await auditRepository.append({
    entityType: 'Order',
    entityId: orderId,
    action: 'status_change',
    performedBy: performedByUserId,
    metadata: { from: RESERVED, to: CONFIRMED },
  });
  return { success: true, order: await orderRepository.findById(orderId) };
}

/** Seller rejects; restore stock and set REJECTED. */
export async function rejectOrder(
  orderId: string,
  sellerHospitalId: string,
  performedByUserId: string | null
) {
  const order = await orderRepository.findById(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status !== RESERVED) return { success: false, error: 'Order is not in RESERVED state' };
  if (order.sellerHospitalId !== sellerHospitalId) return { success: false, error: 'Not your order' };

  await prisma.$transaction(async (tx) => {
    const listing = await listingRepository.findByIdForUpdate(tx, order.listingId);
    if (listing) {
      const newQty = listing.quantityAvailable + order.quantity;
      const newStatus = listing.status === SOLD_OUT ? ACTIVE : listing.status;
      await listingRepository.updateQuantityAndStatus(tx, order.listingId, newQty, newStatus);
    }
    await orderRepository.updateStatusWithTx(tx, orderId, REJECTED, null);
  });

  await auditRepository.append({
    entityType: 'Order',
    entityId: orderId,
    action: 'status_change',
    performedBy: performedByUserId,
    metadata: { from: RESERVED, to: REJECTED, stockRestored: order.quantity },
  });
  return { success: true, order: await orderRepository.findById(orderId) };
}

/** Buyer or system cancels; if RESERVED, restore stock. */
export async function cancelOrder(
  orderId: string,
  buyerHospitalId: string,
  performedByUserId: string | null
) {
  const order = await orderRepository.findById(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status !== RESERVED && order.status !== PENDING) {
    return { success: false, error: 'Order cannot be cancelled in current state' };
  }
  if (order.buyerHospitalId !== buyerHospitalId) return { success: false, error: 'Not your order' };

  if (order.status === RESERVED) {
    await prisma.$transaction(async (tx) => {
      const listing = await listingRepository.findByIdForUpdate(tx, order.listingId);
      if (listing) {
        const newQty = listing.quantityAvailable + order.quantity;
        const newStatus = listing.status === SOLD_OUT ? ACTIVE : listing.status;
        await listingRepository.updateQuantityAndStatus(tx, order.listingId, newQty, newStatus);
      }
      await orderRepository.updateStatusWithTx(tx, orderId, CANCELLED, null);
    });
  } else {
    await orderRepository.updateStatus(orderId, CANCELLED);
  }

  await auditRepository.append({
    entityType: 'Order',
    entityId: orderId,
    action: 'status_change',
    performedBy: performedByUserId,
    metadata: { from: order.status, to: CANCELLED },
  });
  return { success: true, order: await orderRepository.findById(orderId) };
}

/** Expire RESERVED orders past timeout; restore stock. Called by cron or manual trigger. */
export async function expireReservedOrders(performedByUserId: string | null) {
  const cutoff = new Date(Date.now() - config.orderReservationTimeoutMinutes * 60 * 1000);
  const reserved = await orderRepository.findReservedPastTimeout(cutoff);
  const results: { orderId: string; expired: boolean }[] = [];

  for (const order of reserved) {
    await prisma.$transaction(async (tx) => {
      const listing = await listingRepository.findByIdForUpdate(tx, order.listingId);
      if (listing) {
        const newQty = listing.quantityAvailable + order.quantity;
        const newStatus = listing.status === SOLD_OUT ? ACTIVE : listing.status;
        await listingRepository.updateQuantityAndStatus(tx, order.listingId, newQty, newStatus);
      }
      await orderRepository.updateStatusWithTx(tx, order.id, EXPIRED, null);
    });
    await auditRepository.append({
      entityType: 'Order',
      entityId: order.id,
      action: 'status_change',
      performedBy: performedByUserId,
      metadata: { from: RESERVED, to: EXPIRED, reason: 'timeout' },
    });
    results.push({ orderId: order.id, expired: true });
  }

  return { expiredCount: results.length, results };
}

/** Mark order COMPLETED (mock fulfillment). Seller side. */
export async function completeOrder(
  orderId: string,
  sellerHospitalId: string,
  performedByUserId: string | null
) {
  const order = await orderRepository.findById(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status !== CONFIRMED) return { success: false, error: 'Order must be CONFIRMED to complete' };
  if (order.sellerHospitalId !== sellerHospitalId) return { success: false, error: 'Not your order' };

  await orderRepository.updateStatus(orderId, COMPLETED);
  await auditRepository.append({
    entityType: 'Order',
    entityId: orderId,
    action: 'status_change',
    performedBy: performedByUserId,
    metadata: { from: CONFIRMED, to: COMPLETED },
  });
  return { success: true, order: await orderRepository.findById(orderId) };
}

export const orderService = {
  initiatePurchase,
  confirmOrder,
  rejectOrder,
  cancelOrder,
  expireReservedOrders,
  completeOrder,
};
