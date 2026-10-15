import test, { afterEach, before, suite } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { type Browser, createBrowser } from "../../../test/browser.ts";
import bundle from "../../../core/internal/bundle/lib/bundle/index.ts";
import { cleanup, sample, tailwindcssBuilder } from "./common.ts";

// the page's first pixel, under a full-size bg-red-500 div
const RED_500 = [251, 44, 54];

async function firstPixel(browser: Browser) {
    const page = await browser.createPage();
    await page.page.waitForFunction('document.body.classList.contains("done")');
    const color = await page.getPixelColorRGB({ x: 0, y: 0 });
    await page.page.close();
    return color;
}

suite("tailwindcss plugin - integration", () => {
    let browser: Browser;

    before(cleanup);
    afterEach(async () => {
        await browser?.end();
        cleanup();
    });

    test("bundled by the core", async () => {
        browser = await createBrowser(sample);
        const builder = await tailwindcssBuilder();
        await bundle.bundle(path.join(sample, "index.ts"));
        builder.end();

        assert.deepEqual(await firstPixel(browser), RED_500);
    });

    // the plugin running in the webview, bundling a project there
    test("bundled in the webview", async () => {
        const build = path.join(sample, "build");
        for (const dependency of [
            "oxide-wasm",
            "lightningcss-wasm",
            "tailwindcss"
        ]) {
            fs.cpSync(
                path.join("node_modules", dependency),
                path.join(build, "node_modules", dependency),
                { recursive: true }
            );
        }
        await bundle.bundle(path.join(build, "index.ts"));
        browser = await createBrowser(build);

        assert.deepEqual(await firstPixel(browser), RED_500);
    });
});
