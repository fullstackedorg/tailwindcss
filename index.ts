import fs from "fs";
import path from "path";
import oxide, { extract } from "@esm.sh/oxide-wasm";
import { compile } from "tailwindcss";
import lightningcss, { transform } from "lightningcss-wasm";

let oxideInit: Promise<void> | null = null;
let lightningcssInit: Promise<void> | null = null;
let tailwindcssBaseDir: string | null = null;

export function init(wasm: {
    oxide: string,
    tailwindcss: string,
    lightningcss: string
}) {
    if (oxideInit === null) {
        oxideInit = oxide(fs.promises.readFile(wasm.oxide));
    }

    if (lightningcssInit === null) {
        lightningcssInit = lightningcss(wasm.lightningcss);
    }

    if (tailwindcssBaseDir === null) {
        tailwindcssBaseDir = wasm.tailwindcss;
    }

    return Promise.all([
        oxideInit,
        lightningcssInit
    ]);
}

async function loadStylesheet(id: string, base: string) {
    if (tailwindcssBaseDir === null) {
        throw new Error("tailwindcss has not been initialized");
    }

    if (id === "tailwindcss") {
        return {
            path: "virtual:tailwindcss/index.css",
            base,
            content: await fs.promises.readFile(path.join(tailwindcssBaseDir, "index.css"), "utf-8")
        };
    } else if (
        id === "tailwindcss/theme" ||
        id === "tailwindcss/theme.css" ||
        id === "./theme.css"
    ) {
        return {
            path: "virtual:tailwindcss/theme.css",
            base,
            content: await fs.promises.readFile(path.join(tailwindcssBaseDir, "theme.css"), "utf-8")
        };
    } else if (
        id === "tailwindcss/utilities" ||
        id === "tailwindcss/utilities.css" ||
        id === "./utilities.css"
    ) {
        return {
            path: "virtual:tailwindcss/utilities.css",
            base,
            content: await fs.promises.readFile(path.join(tailwindcssBaseDir, "utilities.css"), "utf-8")
        };
    }

    throw new Error(`The browser build does not support @import for "${id}"`);
}

export async function build(outfile: string, files: string[]) {
    const contents = await Promise.all(files.map(file => fs.promises.readFile(file, "utf-8")));
    const candidate = contents.map(content => extract(content)).flat();
    const compiler = await compile("@import 'tailwindcss';", { loadStylesheet });
    const css = compiler.build(candidate);
    const result = transform({
        filename: "input.css",
        code: new TextEncoder().encode(css)
    })
    return fs.promises.writeFile(outfile, result.code);
}
