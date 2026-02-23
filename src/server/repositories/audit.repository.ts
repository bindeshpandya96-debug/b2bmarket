/**
 * Audit repository: append-only writes. No updates or deletes.
 * When tx is provided, writes in the same transaction (e.g. for order flow).
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AuditPayload = {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string | null;
  metadata?: Record<string, unknown>;
};

function toCreateInput(payload: AuditPayload): Prisma.AuditLogUncheckedCreateInput {
  return {
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    performedBy: payload.performedBy,
    metadata: payload.metadata ?? undefined,
  };
}

export const auditRepository = {
  async append(payload: AuditPayload, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditLog.create({
      data: toCreateInput(payload),
    });
  },
};
