import { StatusCodes } from 'http-status-codes';

import { type Metrics, MetricsSchema } from '~model/metrics.ts';

import {
    InsufficientPermissions,
    InvalidSession,
    BadContentNegotiation,
    UnexpectedStatusCode,
} from './error.ts';

export namespace Metrics {
    export async function generateUserSummary(): Promise<Metrics> {
        const res = await fetch('/api/metrics/user', {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' },
        });
        switch (res.status) {
            case StatusCodes.OK: return MetricsSchema.parse(await res.json());
            case StatusCodes.UNAUTHORIZED: throw new InvalidSession;
            case StatusCodes.FORBIDDEN: throw new InsufficientPermissions;
            case StatusCodes.NOT_ACCEPTABLE: throw new BadContentNegotiation;
            default: throw new UnexpectedStatusCode;
        }
    }
}
