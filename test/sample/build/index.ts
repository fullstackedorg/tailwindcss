// @ts-ignore
import bundle from "bundle";
// @ts-ignore
import plugin from "plugin";
import pluginTailwindcss from "../../..";

await plugin.register("build", pluginTailwindcss);

console.log(await bundle.bundle("./project"));

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "./project/out/index.css.tailwind.css";
document.head.appendChild(link);

const projectEntry = "./project/out/index.ts.js?v=2";
await import(projectEntry);
