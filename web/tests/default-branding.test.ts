import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { defaultConfig } from "../src/stores/use-config-store";
import { useThemeStore } from "../src/stores/use-theme-store";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const userStatusActions = readFileSync(new URL("../src/components/layout/user-status-actions.tsx", import.meta.url), "utf8");
const configModal = readFileSync(new URL("../src/components/layout/app-config-modal.tsx", import.meta.url), "utf8");
const clientRootInit = readFileSync(new URL("../src/components/layout/client-root-init.tsx", import.meta.url), "utf8");

assert.equal(useThemeStore.getState().theme, "light", "new users default to the light theme");
assert.match(indexHtml, /s\.state && s\.state\.theme === "dark" \? "dark" : "light"/, "initial theme script defaults to light");
assert.equal(defaultConfig.baseUrl, "https://token.offerya.cc", "default Base URL uses the configured service");
assert.equal(defaultConfig.channels[0]?.baseUrl, "https://token.offerya.cc", "default channel uses the configured service");
assert.equal(defaultConfig.channels[0]?.name, "usetoken", "default channel uses the product name");
assert.equal(defaultConfig.videoModel, "default::grok-video", "default video model matches the configured service");
assert.match(clientRootInit, /name: "usetoken"/, "URL-based configuration uses the product channel name");
assert.match(configModal, /placeholder="请前往 Base URL 获取 API Key"/, "empty API Key input explains where to get a key");
assert.doesNotMatch(userStatusActions, /VersionReleaseModal/, "version control is hidden from the top-right actions");
assert.doesNotMatch(userStatusActions, /GitHubLink/, "GitHub link is hidden from the top-right actions");

console.log("default branding tests passed");
