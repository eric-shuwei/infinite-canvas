import assert from "node:assert/strict";

import { extractPromptImages } from "../src/lib/prompt-images";

assert.deepEqual(
    extractPromptImages(
        "https://raw.githubusercontent.com/example/prompts/main",
        `
<img src="assets/first.png" alt="first">
![second](https://example.com/second.png)
<img src='https://example.com/third.png'>
`,
    ),
    [
        "https://raw.githubusercontent.com/example/prompts/main/assets/first.png",
        "https://example.com/second.png",
        "https://example.com/third.png",
    ],
);

assert.deepEqual(
    extractPromptImages(
        "https://raw.githubusercontent.com/example/prompts/main",
        `
![duplicate](assets/image.png)
<img src="assets/image.png">
<img src=https://example.com/final.png>
`,
    ),
    ["https://raw.githubusercontent.com/example/prompts/main/assets/image.png", "https://example.com/final.png"],
);

console.log("prompt image extraction tests passed");
