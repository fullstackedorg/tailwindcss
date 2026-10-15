import test, { after, before, suite } from "node:test";
import assert from "node:assert";
import child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import bundle from "../../../core/internal/bundle/lib/bundle/index.ts";
import { cleanup, cli, sample, tailwindcssBuilder } from "./common.ts";

suite("tailwindcss plugin - e2e", () => {
    before(cleanup);
    after(cleanup);

    // the plugin's output must be the Tailwind CLI's, byte for byte
    test("same output as the tailwindcss cli", async () => {
        child_process.execFileSync(
            process.execPath,
            [
                cli("@tailwindcss/cli", "tailwindcss"),
                "-i",
                "index.css",
                "-o",
                "output.css"
            ],
            { stdio: "ignore", cwd: sample }
        );

        const builder = await tailwindcssBuilder();
        const result = await bundle.bundle(sample);
        builder.end();

        assert.deepEqual(result.Errors, null);
        assert.deepEqual(result.Warnings, null);
        assert.deepEqual(
            result.OutputFiles,
            [
                "index.ts.js",
                "index.ts.css",
                "index.css.tailwind.css",
                "index.html"
            ].map((file) => path.join(sample, "out", file))
        );
        assert.deepEqual(
            fs.readFileSync(path.join(sample, "out", "index.css.tailwind.css")),
            fs.readFileSync(path.join(sample, "output.css"))
        );
    });
});
