import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("antd") ||
            id.includes("@ant-design") ||
            id.includes("rc-") ||
            id.includes("@rc-component")
          ) {
            return "antd-ui";
          }
          return undefined;
        },
      },
    },
  },
});
