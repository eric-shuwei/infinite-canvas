import assert from "node:assert/strict";

import { fixedVideoModelResolution } from "../src/lib/video-model-resolution";

assert.deepEqual(fixedVideoModelResolution("seedance-2.0-480p"), { label: "480p", value: "480p" });
assert.deepEqual(fixedVideoModelResolution("default::seedance-2.0-720p"), { label: "720p", value: "720p" });
assert.deepEqual(fixedVideoModelResolution("seedance-2.0-1080P"), { label: "1080p", value: "1080p" });
assert.deepEqual(fixedVideoModelResolution("seedance-2.0-2k"), { label: "2K", value: "2k" });
assert.deepEqual(fixedVideoModelResolution("seedance-2.0-4k"), { label: "4K", value: "4k" });
assert.equal(fixedVideoModelResolution("seedance-2.0"), undefined);
assert.equal(fixedVideoModelResolution("seedance-2.0-4k-preview"), undefined);

console.log("video model resolution tests passed");
