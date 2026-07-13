// Local-disk implementation of the core's file store. PWS blobs live
// under baseDir keyed exactly like the S3 keys (pws/<contractId>/...).
// The upload/download URLs point back at this same server's /__pws
// endpoints (see server.mjs), so the browser's presigned-URL flow works
// unchanged -- it just PUTs/GETs same-origin instead of to S3.
import { rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

export function createDiskFiles(baseDir) {
  const root = resolve(baseDir);

  // Resolve a storage key to an absolute path inside baseDir, rejecting
  // any traversal (keys are server-chosen, but never trust the path).
  function keyToPath(key) {
    const target = resolve(root, key);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("invalid storage key");
    return target;
  }

  return {
    root,
    keyToPath,
    uploadTarget(key) {
      return { uploadUrl: `/__pws/${encodeURIComponent(key)}` };
    },
    downloadUrl(key, filename) {
      if (!key) return null;
      const q = filename ? `?filename=${encodeURIComponent(filename)}` : "";
      return `/__pws/${encodeURIComponent(key)}${q}`;
    },
    async delete(key) {
      if (!key) return;
      await rm(keyToPath(key), { force: true }).catch(() => {});
    },
  };
}
