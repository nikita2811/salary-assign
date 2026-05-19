import axios from "axios";

// ── Case Converters ───────────────────────────────────────────────────────────

function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnake(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToSnake);
    }
    if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, val]) => [
                camelToSnake(key),
                convertKeysToSnake(val),   // ✅ recursive for nested objects
            ])
        );
    }
    return obj;
}

function convertKeysToCamel(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToCamel); // ✅ recurse into each array item
    }
    if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>).map(([key, val]) => [
                snakeToCamel(key),
                convertKeysToCamel(val), // ✅ recurse into nested objects
            ])
        );
    }
    return obj;
}

// ── Axios Instance ────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: "https://salary-badt.onrender.com/",
    headers: { "Content-Type": "application/json" },
});

// ── Outgoing: camelCase → snake_case ─────────────────────────────────────────
api.interceptors.request.use((config) => {
    if (config.data && typeof config.data === "object") {
        config.data = convertKeysToSnake(config.data);
    }
    return config;
});

// ── Incoming: snake_case → camelCase ─────────────────────────────────────────
api.interceptors.response.use(
    (response) => {
        if (response.data && typeof response.data === "object") {
            response.data = convertKeysToCamel(response.data);
        }
        return response;
    },
    (error) => Promise.reject(error)
);

export default api;