/// <reference types="vite/client" />
import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig(() => {
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
      }),
    ],
    resolve: {
      alias: {
        crypto: "crypto-browserify",
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "src", "index.ts"),
        name: "crypto-web",
        fileName: "index",
      },
    },
  };
});
