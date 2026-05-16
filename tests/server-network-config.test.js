import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hana-server-network-"));
}

describe("server network config", () => {
  let tmpDir = null;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  });

  it("resolves missing config to loopback defaults", async () => {
    tmpDir = makeTmpDir();
    const {
      loadServerNetworkConfig,
      resolveServerListenOptions,
    } = await import("../core/server-network-config.js");

    expect(loadServerNetworkConfig(tmpDir)).toMatchObject({
      schemaVersion: 1,
      mode: "loopback",
      listenHost: "127.0.0.1",
    });
    expect(resolveServerListenOptions(tmpDir)).toMatchObject({
      mode: "loopback",
      host: "127.0.0.1",
    });
  });

  it("allows explicit LAN listening when mode is lan", async () => {
    tmpDir = makeTmpDir();
    const {
      resolveServerListenOptions,
      saveServerNetworkConfig,
    } = await import("../core/server-network-config.js");

    saveServerNetworkConfig(tmpDir, {
      schemaVersion: 1,
      mode: "lan",
      listenHost: "0.0.0.0",
      customRemote: { enabled: false, baseUrl: null, wsUrl: null },
      createdAt: "2026-05-16T00:00:00.000Z",
      updatedAt: "2026-05-16T00:00:00.000Z",
    });

    expect(resolveServerListenOptions(tmpDir)).toMatchObject({
      mode: "lan",
      host: "0.0.0.0",
    });
  });

  it("rejects public hosts in loopback mode", async () => {
    tmpDir = makeTmpDir();
    const { saveServerNetworkConfig } = await import("../core/server-network-config.js");

    expect(() => saveServerNetworkConfig(tmpDir, {
      schemaVersion: 1,
      mode: "loopback",
      listenHost: "0.0.0.0",
    })).toThrow("loopback mode must listen on a loopback host");
  });

  it("rejects unknown modes and invalid hosts explicitly", async () => {
    tmpDir = makeTmpDir();
    const { saveServerNetworkConfig } = await import("../core/server-network-config.js");

    expect(() => saveServerNetworkConfig(tmpDir, {
      schemaVersion: 1,
      mode: "internet",
      listenHost: "127.0.0.1",
    })).toThrow("mode must be one of");
    expect(() => saveServerNetworkConfig(tmpDir, {
      schemaVersion: 1,
      mode: "lan",
      listenHost: "",
    })).toThrow("listenHost required");
  });
});
