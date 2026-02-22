import { build, init } from "./index.ts";
import fs from "fs";
import assert from "assert";

fs.writeFileSync("index.css", `@import 'tailwindcss';`);

fs.writeFileSync("index.html", `<h1 class="text-3xl font-bold underline bg-red-500">
  Hello world!
</h1>`);

await init({
  lightningcss: "node_modules/lightningcss-wasm/lightningcss_node.wasm",
  oxide: "node_modules/@esm.sh/oxide-wasm/pkg/oxide_wasm_bg.wasm",
  tailwindcss: "node_modules/tailwindcss"
});

const outfile = "./output.css";

await build("index.css", outfile, ["index.html"]);

assert.ok(fs.existsSync(outfile))

fs.rmSync("index.html")
fs.rmSync(outfile)
fs.rmSync("index.css")

