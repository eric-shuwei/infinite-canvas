import assert from "node:assert/strict";

import { closestGeminiAspectRatio } from "../src/services/api/image.ts";

for (const ratio of ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"]) {
    assert.equal(closestGeminiAspectRatio(ratio), ratio, `Gemini ratio matching should preserve ${ratio}`);
}
assert.throws(() => closestGeminiAspectRatio("4:1"), /图像宽高比不能超过 3:1/, "User-selected ratios must keep the existing 3:1 safety limit");

console.log("Gemini image ratio tests passed");
