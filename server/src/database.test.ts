import { assert, assertArrayIncludes, assertEquals, assertStrictEquals, equal } from 'asserts';
import { encode } from 'base64url';
import { Pool } from 'postgres';
import { validate } from 'uuid';

import { Database } from './database.ts';
import { env } from './env.ts';

const options = {
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    hostname: env.PG_HOSTNAME,
    port: env.PG_PORT,
    database: env.PG_DATABASE,
};

Deno.test('full OAuth flow', async t => {
    const pool = new Pool(options, 1, false);
    const db = await Database.fromPool(pool);

    const office = await db.createOffice('Test');
    await t.step('update office information', async () => {
        assert(!(await db.updateOffice({ id: 0, name: 'Hello' })));
        assert(await db.updateOffice({ id: office, name: 'Hello' }));
    });

    await t.step('successfully revoke invites from the system', async () => {
        const email = 'world@up.edu.ph';
        const permission = 0;
        const creation = await db.upsertInvitation({
            office,
            email,
            permission,
        });
        assert(new Date > creation);

        const result = await db.revokeInvitation(office, email);
        assert(result !== null);
        assertEquals(result, { permission, creation });
    });

    const USER = {
        id: crypto.randomUUID(),
        name: 'Hello World',
        email: 'hello@up.edu.ph',
        permission: 0,
    };

    await t.step('invite user to an office', async t => {
        const creation = await db.upsertInvitation({
            office,
            email: USER.email,
            permission: 0,
        });
        assert(new Date > creation);

        await t.step('invalid revocation of invites', async () => {
            // Non-existent office, but valid email
            assertStrictEquals(await db.revokeInvitation(0, USER.email), null);

            // Non-existent email, but valid office
            assertStrictEquals(await db.revokeInvitation(office, 'user@example.com'), null);
        });

        const result = await db.insertInvitedUser(USER);
        assert(result !== null);
        assertArrayIncludes(result, [ office ]);
    });

    await t.step('non-existent session invalidation', async () =>
        assertStrictEquals(await db.invalidateSession(crypto.randomUUID()), null));

    await t.step('pending session invalidation', async () => {
        const { id, nonce, expiration } = await db.generatePendingSession();
        assert(validate(id));
        assertStrictEquals(nonce.length, 64);
        assert(new Date < expiration);

        assert(!(await db.checkValidSession(id)));
        assertStrictEquals(await db.getUserFromSession(id), null);
        assertStrictEquals(await db.getPermissionsFromSession(id, office), null);

        const result = await db.invalidateSession(id);
        assert(result !== null);
        assertEquals(result.data, { nonce, expiration });
    });

    const access_token = 'access-token';
    const { id, nonce, expiration } = await db.generatePendingSession();
    await t.step('user OAuth flow', async () => {
        assert(validate(id));
        assertStrictEquals(nonce.length, 64);
        assert(new Date < expiration);

        assert(!(await db.checkValidSession(id)));
        assertStrictEquals(await db.getUserFromSession(id), null);
        assertStrictEquals(await db.getPermissionsFromSession(id, office), null);

        const old = await db.upgradeSession({
            id,
            user_id: USER.id,
            expiration,
            access_token,
        });
        assertEquals(old, { nonce, expiration });

        assert(await db.checkValidSession(id));
        assertEquals(await db.getUserFromSession(id), USER);
        assertStrictEquals(await db.getPermissionsFromSession(id, office), 0);
    });

    await t.step('valid session invalidation', async () => {
        const result = await db.invalidateSession(id);
        assert(result !== null);
        assertEquals(result.data, {
            user_id: USER.id,
            expiration,
            access_token,
        });
    });

    await t.step('category tests', async () => {
        assertStrictEquals(await db.activateCategory(0), null);
        assertStrictEquals(await db.deleteCategory(0), null);

        const first = 'Leave of Absence';
        const id = await db.createCategory(first);
        assert(id !== null);
        assertEquals(await db.activateCategory(id), first);
        assertArrayIncludes(await db.getActiveCategories(), [ { id, name: first } ]);

        const second = 'Request for Drop';
        assert(await db.renameCategory({ id, name: second }));
        assertEquals(await db.activateCategory(id), second);
        assertArrayIncludes(await db.getActiveCategories(), [ { id, name: second } ]);
        assertEquals(await db.deleteCategory(id), { name: second, deleted: true });

        assertStrictEquals(await db.activateCategory(id), null);
        assertStrictEquals(await db.deleteCategory(id), null);
    });

    const { id: batch, codes } = await db.generateBatch({ office, generator: USER.id });
    await t.step('batch generation', () => {
        assert(Number.isSafeInteger(batch));
        assert(batch > 0);
        assertStrictEquals(codes.length, 10);
        // TODO: Test if we are indeed the minimum batch
    });

    // Randomly generate a category for uniqueness
    const random = encode(crypto.getRandomValues(new Uint8Array(15)));
    assertStrictEquals(random.length, 20);

    const category = await db.createCategory(random);
    assert(category !== null);

    await t.step('document creation', async () => {
        const [ chosen, ...others ] = codes;
        assert(chosen);
        assertStrictEquals(others.length, 9);

        assert(await db.assignBarcodeToDocument({ id: chosen, category, title: 'DocTrack Team' }));
        // TODO: Test if we are indeed the minimum batch
    });

    await t.step('category deprecation and activation', async () => {
        // Deprecation
        const result = await db.deleteCategory(category);
        assert(result !== null);
        assertEquals(result, { name: random, deleted: false });

        // Not in any of the active categories
        const active = await db.getActiveCategories();
        assert(!active.some(cat => equal(cat, { id: category, name: random })));

        // Activation
        const activation = await db.activateCategory(category);
        assertEquals(activation, random);
        assertArrayIncludes(await db.getActiveCategories(), [ { id: category, name: random } ]);
    });

    db.release();
    await pool.end();
});
