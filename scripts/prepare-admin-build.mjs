import { renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const outputDir = resolve("dist-admin");
const source = resolve(outputDir, "admin-index.html");
const target = resolve(outputDir, "index.html");

rmSync(target, { force: true });
renameSync(source, target);
