// ===== Media Store (IndexedDB) — for big files like videos =====
// localStorage is too small (~5MB) for videos, so files go here.

const MediaStore = {
    _db: null,

    open() {
        if (this._db) return Promise.resolve(this._db);
        return new Promise((resolve, reject) => {
            let req;
            try {
                req = indexedDB.open('saintTropezMedia', 1);
            } catch (e) {
                reject(e);
                return;
            }
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }
            };
            req.onsuccess = () => {
                this._db = req.result;
                resolve(this._db);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async put(id, blob) {
        const db = await this.open();
        const record = {
            id,
            blob,
            type: blob.type || '',
            name: blob.name || id,
            size: blob.size || 0,
            updatedAt: new Date().toISOString()
        };
        return new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readwrite');
            tx.objectStore('files').put(record);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    },

    async get(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readonly');
            const req = tx.objectStore('files').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    },

    async info(id) {
        try {
            const r = await this.get(id);
            return r ? { name: r.name, size: r.size, type: r.type } : null;
        } catch (e) {
            return null;
        }
    },

    async remove(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('files', 'readwrite');
            tx.objectStore('files').delete(id);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }
};

// Resolve any media value to a playable/displayable URL:
// "indexeddb:<id>" → object URL from IndexedDB, anything else → as-is.
async function resolveMediaURL(value) {
    if (!value) return null;
    if (typeof value === 'string' && value.startsWith('indexeddb:')) {
        try {
            const rec = await MediaStore.get(value.slice('indexeddb:'.length));
            if (rec && rec.blob) return URL.createObjectURL(rec.blob);
            return null;
        } catch (e) {
            return null;
        }
    }
    return value;
}

window.MediaStore = MediaStore;
window.resolveMediaURL = resolveMediaURL;
