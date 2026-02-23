/**
 * Server config from env. Validated at startup where possible.
 */
export const config = {
  orderReservationTimeoutMinutes: Number(process.env.ORDER_RESERVATION_TIMEOUT_MINUTES ?? 60),
} as const;
