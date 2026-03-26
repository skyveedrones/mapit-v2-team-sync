// Entry point for Railway deployment
// Imports the real startServer from _core which sets up Express, tRPC, OAuth, etc.
import { startServer } from "./_core/index.js";

startServer().catch((error: any) => {
  console.error("[Server] Fatal startup error:", error);
  process.exit(1);
});
