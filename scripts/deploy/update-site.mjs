// 一键更新：下载 develop 最新代码 -> 上传 -> 服务器构建重启
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { Client } from "ssh2";

const HOST = "154.8.196.156";
const USER = "ubuntu";
const KEY = "C:/Users/Admin/Documents/ChatGPT/New project/.deploy-secrets/Codex.pem";
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "site-update-"));
const zipPath = path.join(workDir, "dev.zip");

console.log("==> 1/4 下载 develop 最新代码");
execSync(
  `gh api -H "Accept: application/vnd.github+json" repos/chiyuan222/Nodusfall-wiki/zipball/develop > "${zipPath}"`,
  { stdio: "inherit", shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash" },
);
console.log("    zip bytes:", fs.statSync(zipPath).size);

const conn = new Client();
await new Promise((resolve, reject) => {
  conn
    .on("ready", resolve)
    .on("error", reject)
    .connect({ host: HOST, port: 22, username: USER, privateKey: fs.readFileSync(KEY), readyTimeout: 20000 });
});

console.log("==> 2/4 上传代码包");
await new Promise((resolve, reject) => {
  conn.sftp((err, sftp) => {
    if (err) return reject(err);
    sftp.fastPut(zipPath, "/tmp/dev.zip", (e) => (e ? reject(e) : resolve()));
  });
});

console.log("==> 3/4 上传更新脚本");
const scriptPath = path.join(process.cwd(), "scripts", "deploy", "remote-update.sh");
const assignPath = path.join(process.cwd(), "scripts", "deploy", "assign-site-ids.cjs");
const wordsPath = path.join(process.cwd(), "scripts", "deploy", "seed-sensitive-words.cjs");
const migratePath = path.join(process.cwd(), "scripts", "deploy", "migrate-rbac-v2.cjs");
await new Promise((resolve, reject) => {
  conn.sftp((err, sftp) => {
    if (err) return reject(err);
    sftp.fastPut(scriptPath, "/tmp/remote-update.sh", (e) =>
      e ? reject(e) : sftp.fastPut(assignPath, "/tmp/assign-site-ids.cjs", (e2) =>
        e2 ? reject(e2) : sftp.fastPut(wordsPath, "/tmp/seed-sensitive-words.cjs", (e3) =>
          e3 ? reject(e3) : sftp.fastPut(migratePath, "/tmp/migrate-rbac-v2.cjs", (e4) =>
            e4 ? reject(e4) : resolve(),
          ),
        ),
      ),
    );
  });
});

console.log("==> 4/4 服务器构建并重启（约 3-6 分钟）");
const code = await new Promise((resolve) => {
  conn.exec("chmod +x /tmp/remote-update.sh && sudo bash /tmp/remote-update.sh", (err, stream) => {
    if (err) return resolve(1);
    stream.on("close", (c) => resolve(c ?? 0)).on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
  });
});

conn.end();
fs.rmSync(workDir, { recursive: true, force: true });
console.log(code === 0 ? "✅ 更新完成" : "❌ 更新失败（exit " + code + "）");
process.exit(code ?? 0);
