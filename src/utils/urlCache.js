
class URLCache {
    constructor() {
        this.cache = new Map();
    }

    async getObjectURL(file) {
        if (!file || !file.path) return null;

        if (this.cache.has(file.path)) {
            return this.cache.get(file.path);
        }

        if (file.handle) {
            try {
                const fileData = await file.handle.getFile();
                const url = URL.createObjectURL(fileData);
                this.cache.set(file.path, url);
                return url;
            } catch (err) {
                console.error("Failed to create object URL", err);
                return null;
            }
        }
        return null;
    }

    revoke(path) {
        if (this.cache.has(path)) {
            const url = this.cache.get(path);
            URL.revokeObjectURL(url);
            this.cache.delete(path);
        }
    }

    clear() {
        this.cache.forEach(url => URL.revokeObjectURL(url));
        this.cache.clear();
    }
}

export const globalURLCache = new URLCache();
