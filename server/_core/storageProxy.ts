import type { Express } from "express";
import { storageGet } from "../storage";

/**
 * /manus-storage/{key} proxy — now backed by Cloudinary.
 * Redirects to the Cloudinary delivery URL for the given storage key.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.path.replace(/^\/manus-storage\//, "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    try {
      const { url } = await storageGet(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
