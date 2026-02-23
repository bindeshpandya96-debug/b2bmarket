/**
 * Order repository: data access only. No business rules.
 * Used by order.service for all DB reads/writes on orders.
 */

import { prisma } from '@/lib/prisma';
import type { OrderStatus, Prisma } from '@prisma/client';

export const orderRepository = {
  async create(tx: Prisma.TransactionClient, data: Prisma.OrderUncheckedCreateInput) {
    return tx.order.create({ data });
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        listing: true,
        buyerHospital: { select: { id: true, name: true } },
        sellerHospital: { select: { id: true, name: true } },
      },
    });
  },

  async updateStatus(id: string, status: OrderStatus, reservedAt?: Date | null) {
    return prisma.order.update({
      where: { id },
      data: { status, reservedAt: reservedAt ?? undefined, updatedAt: new Date() },
    });
  },

  async updateStatusWithTx(
    tx: Prisma.TransactionClient,
    id: string,
    status: OrderStatus,
    reservedAt?: Date | null
  ) {
    return tx.order.update({
      where: { id },
      data: { status, reservedAt: reservedAt ?? undefined, updatedAt: new Date() },
    });
  },

  /**
   * Find orders in RESERVED status where reservedAt is before the given cutoff (for expiry cron).
   */
  async findReservedPastTimeout(before: Date) {
    return prisma.order.findMany({
      where: { status: 'RESERVED', reservedAt: { lt: before } },
      include: { listing: true },
    });
  },

  async findManyByBuyer(buyerHospitalId: string, limit = 50) {
    return prisma.order.findMany({
      where: { buyerHospitalId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        listing: { select: { id: true, title: true, category: true } },
        sellerHospital: { select: { id: true, name: true } },
      },
    });
  },

  async findManyBySeller(sellerHospitalId: string, limit = 50) {
    return prisma.order.findMany({
      where: { sellerHospitalId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        listing: { select: { id: true, title: true, category: true } },
        buyerHospital: { select: { id: true, name: true } },
      },
    });
  },
};
