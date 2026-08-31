/**
 * dev 服务器启动包装：归一化宿主/端口参数并转发给 next dev。
 *
 * 预览环境可能传入 --host / --hostname / -H、--port / -p（含 = 号写法），
 * 而 next dev 只认 --hostname 与 --port。本脚本统一转换，保证
 * `npm run dev -- --host 0.0.0.0 --port 7100` 等任意写法都可用。
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const argv = process.argv.slice(2);
let host;
let port;
const rest = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--host" || arg === "--hostname" || arg === "-H") {
    host = argv[++i];
  } else if (arg.startsWith("--host=")) {
    host = arg.slice("--host=".length);
  } else if (arg.startsWith("--hostname=")) {
    host = arg.slice("--hostname=".length);
  } else if (arg === "--port" || arg === "-p") {
    port = argv[++i];
  } else if (arg.startsWith("--port=")) {
    port = arg.slice("--port=".length);
  } else {
    rest.push(arg);
  }
}

const nextArgs = ["dev"];
if (host) nextArgs.push("--hostname", host);
if (port) nextArgs.push("--port", String(port));
nextArgs.push(...rest);

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
