import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Los checks de calidad leen archivos del repo: es más rápido y claro
    // ver el archivo que falló en la salida.
    reporters: "verbose",
  },
});
