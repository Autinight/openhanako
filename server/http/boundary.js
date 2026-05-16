export function createRequestContext(c, engine) {
  const runtimeContext = readRuntimeContext(engine);
  const authPrincipal = readAuthPrincipal(c) || createAuthPrincipal(runtimeContext);
  const request = {
    method: c.req.method,
    url: c.req.url,
    path: safePathname(c.req.url),
  };

  return Object.freeze({
    request,
    runtimeContext,
    serverId: authPrincipal?.serverId ?? runtimeContext?.serverId ?? null,
    serverNodeId: authPrincipal?.serverNodeId ?? runtimeContext?.serverNodeId ?? runtimeContext?.serverId ?? null,
    userId: authPrincipal?.userId ?? runtimeContext?.userId ?? null,
    studioId: authPrincipal?.studioId ?? runtimeContext?.studioId ?? null,
    connectionKind: authPrincipal?.connectionKind ?? runtimeContext?.connectionKind ?? null,
    credentialKind: authPrincipal?.credentialKind ?? runtimeContext?.credentialKind ?? null,
    platformAccountId: authPrincipal?.platformAccountId ?? runtimeContext?.platformAccountId ?? null,
    officialServiceKind: authPrincipal?.officialServiceKind ?? runtimeContext?.officialServiceKind ?? null,
    executionBoundary: runtimeContext?.executionBoundary ?? null,
    authPrincipal,
  });
}

export function jsonError(c, {
  code,
  detail,
  status = 500,
}) {
  return c.json({
    error: code,
    ...(detail ? { detail } : {}),
  }, status);
}

function readRuntimeContext(engine) {
  if (typeof engine?.getRuntimeContext !== "function") return null;
  return engine.getRuntimeContext();
}

function readAuthPrincipal(c) {
  if (typeof c?.get !== "function") return null;
  try {
    return c.get("authPrincipal") || null;
  } catch {
    return null;
  }
}

function createAuthPrincipal(runtimeContext) {
  if (!runtimeContext) {
    return Object.freeze({ kind: "unknown" });
  }
  const platformAccountId = runtimeContext.platformAccountId ?? null;
  return Object.freeze({
    kind: platformAccountId ? "platform_account" : "local_user",
    userId: runtimeContext.userId ?? null,
    studioId: runtimeContext.studioId ?? null,
    serverId: runtimeContext.serverId ?? null,
    serverNodeId: runtimeContext.serverNodeId ?? runtimeContext.serverId ?? null,
    platformAccountId,
    officialServiceKind: runtimeContext.officialServiceKind ?? null,
    connectionKind: runtimeContext.connectionKind ?? null,
    credentialKind: runtimeContext.credentialKind ?? null,
    trustState: runtimeContext.trustState ?? null,
    scopes: Array.isArray(runtimeContext.capabilities) ? [...runtimeContext.capabilities] : [],
  });
}

function safePathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}
