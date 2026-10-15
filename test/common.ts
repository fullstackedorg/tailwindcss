// Shared by the plugin's tests, which run from the fullstacked repository
// (its test/index.ts imports test/index.ts here): the core's bundle and
// plugin modules come from there, paths are relative to its root, the
// working directory of `npm test`.

import plugin from "../../../core/internal/bundle/lib/plugin/index.ts";
import pluginTailwindcss, { initialize } from "../index.ts";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

export const sample = path.relative(
    process.cwd(),
    url.fileURLToPath(new URL("./sample", import.meta.url))
);

// the script of a CLI from the plugin's dependencies, found as Node finds a
// package: npx would run it from the workspace's directory (plugins/<name>),
// and the CLI must run in the sample
export function cli(pkg: string, bin: string) {
    let dir = url.fileURLToPath(new URL("..", import.meta.url));
    for (;;) {
        const manifest = path.join(dir, "node_modules", pkg, "package.json");
        if (fs.existsSync(manifest)) {
            const { bin: bins } = JSON.parse(fs.readFileSync(manifest, "utf8"));
            const script = typeof bins === "string" ? bins : bins[bin];
            return path.join(path.dirname(manifest), script);
        }
        const parent = path.dirname(dir);
        if (parent === dir) throw new Error(`${pkg} is not installed`);
        dir = parent;
    }
}

export function cleanup() {
    for (const generated of [
        "out",
        "output.css",
        "build/out",
        "build/node_modules",
        "build/project/out"
    ]) {
        fs.rmSync(path.join(sample, generated), {
            force: true,
            recursive: true
        });
    }
}

export async function tailwindcssBuilder() {
    await initialize({
        skipLightning: true
    });
    const p = await plugin.register("build", pluginTailwindcss);

    return {
        end: () => p.unregister()
    };
}
