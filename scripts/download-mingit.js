#!/usr/bin/env node
/**
 * download-mingit.js — CI 用，下载官方 MinGit 到 vendor/mingit/
 *
 * Windows 打包前运行：node scripts/download-mingit.js
 * electron-builder 的 extraResources 会把 vendor/mingit/ 打进安装包的 resources/git/
 *
 * MinGit 是 Git for Windows 面向嵌入应用的非交互发行版：
 *   - 含 cmd/git.exe、mingw64/bin/git.exe、SSH/HTTPS remote、credential helpers
 *   - 含 usr/bin/sh.exe（bash 以 POSIX/sh 模式运行）与常用 coreutils
 *   - 不含 bash.exe / Git Bash 交互层 / Perl / Tcl-Tk
 * 体积与文件数远小于 PortableGit（约 367 个文件 / 94MB），无需再做裁剪。
 * 设计见 .docs/specs/2026-07-02-windows-mingit-runtime.md
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VENDOR_DIR = path.join(ROOT, "vendor", "mingit");

export const MINGIT_VERSION = "2.55.0";
const MINGIT_RELEASE = `v${MINGIT_VERSION}.windows.1`;
// 与官方 release notes（github.com/git-for-windows/git/releases/tag/v2.55.0.windows.1）核对一致
export const MINGIT_SHA256 = "31497e7968196332263459ee319d2524e3ebc5786ab895e2abad34ffdd4f4ebf";
export const MINGIT_URL = `https://github.com/git-for-windows/git/releases/download/${MINGIT_RELEASE}/MinGit-${MINGIT_VERSION}-64-bit.zip`;
const ARCHIVE_PATH = path.join(ROOT, "vendor", `mingit-${MINGIT_VERSION}.zip`);

// 运行时完整性契约：installer.nsh 与 launch-integrity.cjs 依赖 git.exe + sh.exe，
// win32-exec.ts 的 git runner 依赖两个 git.exe 入口。缺任何一个都拒绝产出。
export const REQUIRED_RUNTIME_FILES = [
  "cmd/git.exe",
  "mingw64/bin/git.exe",
  "usr/bin/sh.exe",
];

export function missingRuntimeFiles(root) {
  return REQUIRED_RUNTIME_FILES.filter(
    (relative) => !fs.existsSync(path.join(root, ...relative.split("/"))),
  );
}

export function hasMinGitRuntime(root) {
  return missingRuntimeFiles(root).length === 0;
}

function verifySha256(filePath, expected) {
  const actual = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  if (actual !== expected) {
    throw new Error(`MinGit checksum mismatch: expected ${expected}, got ${actual}`);
  }
}

function extractMinGitArchive() {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });

  if (process.platform === "win32") {
    // Windows 10 1803+ 自带 bsdtar，可直接解 zip
    execFileSync("tar.exe", ["-xf", ARCHIVE_PATH, "-C", VENDOR_DIR], {
      stdio: "inherit",
      windowsHide: true,
    });
    return;
  }

  for (const [command, args] of [
    ["unzip", ["-q", "-o", ARCHIVE_PATH, "-d", VENDOR_DIR]],
    ["tar", ["-xf", ARCHIVE_PATH, "-C", VENDOR_DIR]],
  ]) {
    try {
      execFileSync(command, args, { stdio: "inherit" });
      return;
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
  throw new Error("extracting MinGit on non-Windows hosts requires unzip or bsdtar");
}

function assertRuntimeComplete(root) {
  const missing = missingRuntimeFiles(root);
  if (missing.length) {
    throw new Error(
      `[download-mingit] MinGit runtime is incomplete, refusing to produce a broken bundle:\n` +
        missing.map((m) => `  - ${m}`).join("\n"),
    );
  }
}

async function main() {
  // 已存在且完整则跳过
  if (hasMinGitRuntime(VENDOR_DIR)) {
    console.log(`[download-mingit] MinGit ${MINGIT_VERSION} already present, skipping.`);
    return;
  }

  fs.mkdirSync(path.join(ROOT, "vendor"), { recursive: true });

  console.log(`[download-mingit] Downloading MinGit ${MINGIT_VERSION}...`);
  execFileSync("curl", ["--fail", "-L", "-o", ARCHIVE_PATH, MINGIT_URL], { stdio: "inherit" });
  verifySha256(ARCHIVE_PATH, MINGIT_SHA256);

  console.log("[download-mingit] Extracting...");
  extractMinGitArchive();

  fs.unlinkSync(ARCHIVE_PATH);

  assertRuntimeComplete(VENDOR_DIR);

  console.log(`[download-mingit] MinGit ${MINGIT_VERSION} ready at ${VENDOR_DIR}`);
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((err) => {
    console.error("[download-mingit] Failed:", err.message);
    process.exit(1);
  });
}
