import { copyFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const outputDir = resolve("dist-admin");
const source = resolve(outputDir, "admin-index.html");
const indexTarget = resolve(outputDir, "index.html");
const adminTarget = resolve(outputDir, "admin.html");

rmSync(indexTarget, { force: true });
rmSync(adminTarget, { force: true });
copyFileSync(source, indexTarget);
copyFileSync(source, adminTarget);
rmSync(source, { force: true });
