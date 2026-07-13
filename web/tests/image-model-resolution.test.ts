import assert from "node:assert/strict";

import { fixedImageModelResolution, imageSizeRatio } from "../src/lib/image-model-resolution";

assert.deepEqual(fixedImageModelResolution("gpt-image-2-1k"), { label: "1K", quality: "low" });
assert.deepEqual(fixedImageModelResolution("default::gpt-image-2-2k"), { label: "2K", quality: "medium" });
assert.deepEqual(fixedImageModelResolution("gpt-image-2-4K"), { label: "4K", quality: "high" });
assert.equal(fixedImageModelResolution("gpt-image-2"), undefined);
assert.equal(fixedImageModelResolution("image-4k-preview"), undefined);

assert.equal(imageSizeRatio("16:9"), "16:9");
assert.equal(imageSizeRatio("2048x1152"), "16:9");
assert.equal(imageSizeRatio("1024x1536"), "2:3");
assert.equal(imageSizeRatio("auto"), undefined);

console.log("image model resolution tests passed");
