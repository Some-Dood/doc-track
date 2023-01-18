import { z } from 'zod';

export const PendingId = z.string().uuid();

export const PendingSchema = z.object({
    id: PendingId,
    // Convert the hex format to byte array
    // @see https://www.postgresql.org/docs/current/datatype-binary.html
    nonce: z.string().max(130),
    expiration: z.coerce.date(),
});

export type Pending = z.infer<typeof PendingSchema>;
