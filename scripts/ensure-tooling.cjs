/**
 * Run before Vite so tooling works when:
 * - `npm install --ignore-scripts` was used (skips esbuild's postinstall), or
 * - Node is darwin x64 (e.g. Rosetta) and @rollup/rollup-darwin-x64 is missing.
 */
const { existsSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");

const root = join(__dirname, "..");

const esbuildInstall = join(root, "node_modules", "esbuild", "install.js");
if (existsSync(esbuildInstall)) {
  try {
    execFileSync(process.execPath, [esbuildInstall], { stdio: "pipe" });
  } catch {
    /* non-fatal */
  }
}

if (process.platform === "darwin" && process.arch === "x64") {
  try {
    require.resolve("@rollup/rollup-darwin-x64/package.json", { paths: [root] });
  } catch {
    const npmCli = process.env.npm_execpath;
    const args = ["install", "@rollup/rollup-darwin-x64@4.60.1", "--no-save", "--force"];
    try {
      if (npmCli) {
        execFileSync(process.execPath, [npmCli, ...args], { cwd: root, stdio: "inherit" });
      } else {
        execFileSync("npm", args, { cwd: root, stdio: "inherit" });
      }
    } catch {
      console.warn(
        "Could not install @rollup/rollup-darwin-x64. If `vite build` fails, run:\n" +
          "  npm install @rollup/rollup-darwin-x64@4.60.1 --no-save --force\n"
      );
    }
  }
}
