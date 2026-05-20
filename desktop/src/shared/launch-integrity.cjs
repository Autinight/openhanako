const fs = require("fs");
const path = require("path");

function canRead(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeSlashes(value) {
  return String(value || "").replace(/\\/g, "/");
}

function buildWindowsInstallSurfaceChecks({ execPath, resourcesPath } = {}) {
  const executablePath = execPath || "";
  const appRoot = executablePath ? path.dirname(executablePath) : "";
  const resourcesRoot = resourcesPath || (appRoot ? path.join(appRoot, "resources") : "");
  const serverRoot = path.join(resourcesRoot, "server");
  const gitRoot = path.join(resourcesRoot, "git");
  const gitExe = path.join(gitRoot, "cmd", "git.exe");
  const bashCandidates = [
    path.join(gitRoot, "bin", "bash.exe"),
    path.join(gitRoot, "usr", "bin", "bash.exe"),
  ];

  return [
    {
      id: "hanako-exe",
      label: "Hanako.exe",
      relativePath: "Hanako.exe",
      paths: [executablePath],
      exists: () => !!executablePath && canRead(executablePath),
    },
    {
      id: "app-asar",
      label: "resources/app.asar",
      relativePath: "resources/app.asar",
      paths: [path.join(resourcesRoot, "app.asar")],
    },
    {
      id: "app-update-yml",
      label: "resources/app-update.yml",
      relativePath: "resources/app-update.yml",
      paths: [path.join(resourcesRoot, "app-update.yml")],
    },
    {
      id: "server-exe",
      label: "resources/server/hana-server.exe",
      relativePath: "resources/server/hana-server.exe",
      paths: [path.join(serverRoot, "hana-server.exe")],
    },
    {
      id: "server-bootstrap",
      label: "resources/server/bootstrap.js",
      relativePath: "resources/server/bootstrap.js",
      paths: [path.join(serverRoot, "bootstrap.js")],
    },
    {
      id: "server-bundle",
      label: "resources/server/bundle/index.js",
      relativePath: "resources/server/bundle/index.js",
      paths: [path.join(serverRoot, "bundle", "index.js")],
    },
    {
      id: "better-sqlite3-native",
      label: "better-sqlite3 native addon",
      relativePath: "resources/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
      paths: [path.join(serverRoot, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node")],
    },
    {
      id: "portable-git",
      label: "PortableGit",
      relativePath: "resources/git",
      paths: [gitExe, ...bashCandidates],
      exists: () => canRead(gitExe) && bashCandidates.some(canRead),
    },
  ];
}

function serializeCheck(item) {
  const exists = typeof item.exists === "function"
    ? item.exists()
    : item.paths.some(canRead);
  return {
    id: item.id,
    label: item.label,
    relativePath: item.relativePath,
    paths: item.paths.map(normalizeSlashes),
    exists,
  };
}

function checkWindowsInstallSurface(opts = {}) {
  const checked = buildWindowsInstallSurfaceChecks(opts).map(serializeCheck);
  const missing = checked.filter(item => !item.exists);
  return {
    ok: missing.length === 0,
    checked,
    missing,
  };
}

function writeLaunchDiagnostic({
  diagnosticsDir,
  fileName,
  event,
  payload,
  now = new Date(),
}) {
  if (!diagnosticsDir || !fileName) {
    throw new Error("writeLaunchDiagnostic: diagnosticsDir and fileName are required");
  }
  fs.mkdirSync(diagnosticsDir, { recursive: true });
  const filePath = path.join(diagnosticsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify({
    event,
    time: now instanceof Date ? now.toISOString() : String(now),
    payload,
  }, null, 2) + "\n", "utf-8");
  return filePath;
}

function appendLaunchLog({ diagnosticsDir, event, payload, now = new Date() }) {
  if (!diagnosticsDir) return null;
  fs.mkdirSync(diagnosticsDir, { recursive: true });
  const filePath = path.join(diagnosticsDir, "launch.log");
  fs.appendFileSync(filePath, JSON.stringify({
    event,
    time: now instanceof Date ? now.toISOString() : String(now),
    payload,
  }) + "\n", "utf-8");
  return filePath;
}

function formatInstallSurfaceError(result, diagnosticPath) {
  const missing = Array.isArray(result?.missing) ? result.missing : [];
  const lines = missing.map(item => `- ${item.relativePath}`);
  const diagnosticLine = diagnosticPath ? `\n\nDiagnostic file:\n${diagnosticPath}` : "";
  return [
    "Hanako installation is incomplete.",
    "",
    "Missing or unreadable files:",
    ...lines,
    diagnosticLine.trimEnd(),
  ].filter(Boolean).join("\n");
}

module.exports = {
  appendLaunchLog,
  buildWindowsInstallSurfaceChecks,
  checkWindowsInstallSurface,
  formatInstallSurfaceError,
  writeLaunchDiagnostic,
};
