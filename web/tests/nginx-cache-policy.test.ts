import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const nginxConfig = readFileSync(new URL("../../nginx.conf", import.meta.url), "utf8");
const indexLocation = nginxConfig.match(/location = \/index\.html \{([\s\S]*?)\n    \}/)?.[1] || "";
const assetsLocation = nginxConfig.match(/location \^~ \/assets\/ \{([\s\S]*?)\n    \}/)?.[1] || "";

assert.match(indexLocation, /Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"/, "SPA entry HTML must not stay cached across deployments");
assert.match(assetsLocation, /try_files \$uri =404;/, "Missing hashed assets must return 404 instead of the SPA HTML fallback");
assert.match(assetsLocation, /Cache-Control "public, max-age=31536000, immutable"/, "Content-hashed assets should remain cacheable");

console.log("nginx cache policy tests passed");
