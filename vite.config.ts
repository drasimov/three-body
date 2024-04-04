import { defineConfig } from "vite";

export default defineConfig({
    base: "/dist/",
    server: {
        host: true,
    }
});
