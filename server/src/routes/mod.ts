import { Status } from 'http';
import { Pool } from 'postgres';

import { handleGetAllCategories, handleCreateCategory } from './api/category.ts';
import { handleSubscribe } from './api/subscribe.ts';
import { handleCallback, handleLogin } from './auth/mod.ts';

export function get(pool: Pool, req: Request) {
    const { pathname, searchParams } = new URL(req.url);
    switch (pathname) {
        case '/auth/login': return handleLogin(pool, req);
        case '/auth/callback': return handleCallback(pool, req, searchParams);
        case '/api/categories': return handleGetAllCategories(pool, req, searchParams);
        default: return new Response(null, { status: Status.NotFound });
    }
}

export function post(pool: Pool, req: Request) {
    const { pathname } = new URL(req.url);
    switch (pathname) {
        case '/api/subscribe': return handleSubscribe(pool, req);
        case '/api/category': return handleCreateCategory(pool, req);
        default: return new Response(null, { status: Status.NotFound });
    }
}
