import { asyncWritable } from '@square/svelte-store';
import { DeferredRegistrationSchema, DeferredSnapshot, DeferredSnapshotSchema } from '../../../../../model/src/api.ts';
import localForage from 'localforage';
import { DeferredFetchSchema } from '../../syncman.ts';
import { Status } from '../../../../../model/src/snapshot.ts';
import { assert } from '../../../assert.ts';
import { topToastMessage } from './ToastStore.ts';
import { z } from 'zod';

const { subscribe, update, reset } = asyncWritable(
    [],
    async() => {
        // Get all keys in the localStorage and resolve all of them and set as contents of this store.
        const keys = await localForage.keys();
        const deferred = keys.map(async key => {
            const defer = DeferredFetchSchema.parse(await localForage.getItem(key));
            const url = new URL(defer.url);
            if (url.pathname.startsWith('/api/document'))
                return { doc: DeferredRegistrationSchema.parse(JSON.parse(defer.body)).id, status: Status.Register };

            return DeferredSnapshotSchema.parse(JSON.parse(defer.body));
        });
        return Promise.all(deferred);
    },
);

export const deferredSnaps = {
    subscribe,
    onDocumentSync(evt: MessageEvent) {
        assert(z.string().parse(evt.data) === 'sync');
        topToastMessage.enqueue({ title: 'Background Syncronization', body: 'Syncronization successful.' });
        reset?.();
    },
    async upsert(insert: DeferredSnapshot) {
        await update(snaps=>{
            const maybeIndex = snaps.findIndex(snap => snap.doc === insert.doc);
            if (maybeIndex >= 0) snaps.splice(maybeIndex, 1);
            return [...snaps, insert];
        });
    },
};