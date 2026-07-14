import fs from "fs";
import path from "path";
import oxide, { extract } from "oxide-wasm";
import { compile } from "tailwindcss";
import lightningcss, { transform } from "lightningcss-wasm";

let init: {
    oxide: Promise<void>;
    lightningcss: Promise<void>;
    tailwindcss: string;
    skipLightning: boolean;
} = null;
let initPromise: Promise<void> = null;

type InitializeOpts = {
    oxide?: string;
    tailwindcss?: string;
    lightningcss?: string;
    skipLightning?: boolean;
};

function findNodeModulesPath(
    subPath: string,
    currentDir: string = process.cwd()
): string {
    const checkPath = path.join(currentDir, "node_modules", subPath);
    if (fs.existsSync(checkPath)) {
        return checkPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir !== currentDir) {
        const found = findNodeModulesPath(subPath, parentDir);
        if (fs.existsSync(found)) {
            return found;
        }
    }
    if (
        currentDir === process.cwd() &&
        typeof import.meta.dirname === "string"
    ) {
        const found = findNodeModulesPath(subPath, import.meta.dirname);
        if (fs.existsSync(found)) {
            return found;
        }
    }
    return checkPath;
}

export function initialize(opts?: InitializeOpts) {
    if (init === null) {
        initPromise = new Promise(async (resolve) => {
            const oxidePath =
                opts?.oxide ||
                findNodeModulesPath("oxide-wasm/pkg/oxide_wasm_bg.wasm");
            const lightningcssPath =
                opts?.lightningcss ||
                findNodeModulesPath("lightningcss-wasm/lightningcss_node.wasm");
            const tailwindcssPath =
                opts?.tailwindcss || findNodeModulesPath("tailwindcss");

            const locations: typeof init = {
                oxide: oxide(fs.promises.readFile(oxidePath)),
                lightningcss: lightningcss(lightningcssPath),
                tailwindcss: tailwindcssPath,
                skipLightning: opts?.skipLightning
            };

            await Promise.all([locations.oxide, locations.lightningcss]);

            init = locations;
            resolve();
        });
    }

    return initPromise;
}

async function loadStylesheet(id: string, base: string) {
    if (init === null) {
        throw new Error("tailwindcss has not been initialized");
    }

    if (id === "tailwindcss") {
        return {
            path: "virtual:tailwindcss/index.css",
            base,
            content: await fs.promises.readFile(
                path.join(init.tailwindcss, "index.css"),
                "utf-8"
            )
        };
    } else if (
        id === "tailwindcss/preflight" ||
        id === "tailwindcss/preflight.css" ||
        id === "./preflight.css"
    ) {
        return {
            path: "virtual:tailwindcss/preflight.css",
            base,
            content: await fs.promises.readFile(
                path.join(init.tailwindcss, "preflight.css"),
                "utf-8"
            )
        };
    } else if (
        id === "tailwindcss/theme" ||
        id === "tailwindcss/theme.css" ||
        id === "./theme.css"
    ) {
        return {
            path: "virtual:tailwindcss/theme.css",
            base,
            content: await fs.promises.readFile(
                path.join(init.tailwindcss, "theme.css"),
                "utf-8"
            )
        };
    } else if (
        id === "tailwindcss/utilities" ||
        id === "tailwindcss/utilities.css" ||
        id === "./utilities.css"
    ) {
        return {
            path: "virtual:tailwindcss/utilities.css",
            base,
            content: await fs.promises.readFile(
                path.join(init.tailwindcss, "utilities.css"),
                "utf-8"
            )
        };
    }

    throw new Error(`The browser build does not support @import for "${id}"`);
}

async function compileTailwind(
    entryfile: string,
    files: string[]
): Promise<string> {
    const entry = await fs.promises.readFile(entryfile, "utf-8");
    const contents = await Promise.all(
        files.map((file) => fs.promises.readFile(file, "utf-8"))
    );
    const candidate = contents.map((content) => extract(content)).flat();
    const compiler = await compile(entry, { loadStylesheet });
    const css = compiler.build(candidate);

    const result = init.skipLightning
        ? css
        : transform({
              filename: "input.css",
              code: new TextEncoder().encode(css)
          }).code;

    return typeof result === "string"
        ? result
        : new TextDecoder().decode(result);
}

async function tailwindBuilder(params: {
    resolved: {
        importer: string;
    }[];
    sources: string[];

    initializeOptions?: InitializeOpts;
}) {
    if (params.sources.length == 0 || params.resolved.length == 0) {
        return [];
    }

    const sources = params.sources.filter((s) => !s.endsWith(".css"));
    await initialize(params.initializeOptions);
    const entryfile = params.resolved.at(0).importer;
    const css = await compileTailwind(entryfile, sources);
    const basename = path.basename(entryfile);

    return [
        {
            outputName: basename + ".tailwind.css",
            contents: css
        }
    ];
}

export const pluginTailwindcss = {
    data: {
        name: "tailwindcss",
        filter: "tailwindcss",
        ext: ["css"]
    },
    callback: tailwindBuilder
};

export default pluginTailwindcss;
