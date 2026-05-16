import { describe, expect, it } from 'vitest';

import {
  deriveSpaceAccessGrant,
  getSpaceConnectionProfile,
  validateSpaceConnectionTrust,
} from '../../services/space-access';
import { createLocalServerConnection } from '../../services/server-connection';

describe('trusted space access contract', () => {
  it('defines local as a loopback-only connection profile', () => {
    expect(getSpaceConnectionProfile('local')).toEqual({
      kind: 'local',
      transport: 'loopback',
      credentialKinds: ['loopback_token'],
      trustState: 'local',
      remoteReachable: false,
      requiresDevicePairing: false,
      requiresPlatformAccount: false,
      dataOwner: 'user_server',
      officialServiceKind: null,
    });
  });

  it('derives a local access grant without treating the loopback token as a remote credential', () => {
    const local = createLocalServerConnection({
      serverPort: 3210,
      serverToken: 'local-token',
    })!;

    expect(deriveSpaceAccessGrant(local)).toEqual({
      grantId: 'access:local:local',
      connectionId: 'local',
      actorKind: 'local_user',
      scope: {
        serverId: 'local',
        userId: null,
        spaceId: 'local',
      },
      transport: 'loopback',
      dataOwner: 'user_server',
      localOnly: true,
      capabilities: [
        'chat',
        'resources.read',
        'resources.write',
        'files.openLocal',
        'tools.run',
        'plugins.use',
        'settings.read',
        'settings.write',
      ],
    });
  });

  it('derives a custom remote grant from device credentials without exposing desktop-only file access', () => {
    const remote = {
      ...createLocalServerConnection({
        serverPort: 3210,
        serverToken: 'local-token',
      })!,
      connectionId: 'custom:remote',
      kind: 'custom_remote' as const,
      serverId: 'server_remote',
      userId: 'user_remote',
      spaceId: 'space_remote',
      label: 'Remote Space',
      baseUrl: 'https://hana.example',
      wsUrl: 'wss://hana.example',
      token: 'remote-token',
      trustState: 'tunnel' as const,
      credentialKind: 'device_credential' as const,
    };

    expect(deriveSpaceAccessGrant(remote)).toEqual({
      grantId: 'access:custom:remote:space_remote',
      connectionId: 'custom:remote',
      actorKind: 'device',
      scope: {
        serverId: 'server_remote',
        userId: 'user_remote',
        spaceId: 'space_remote',
      },
      transport: 'user_managed_tunnel',
      dataOwner: 'user_server',
      localOnly: false,
      capabilities: ['chat', 'resources.read', 'tools.run'],
    });
  });

  it('rejects non-local connections that try to reuse the loopback token credential', () => {
    const invalidRemote = {
      ...createLocalServerConnection({
        serverPort: 3210,
        serverToken: 'local-token',
      })!,
      connectionId: 'custom:bad',
      kind: 'custom_remote' as const,
      baseUrl: 'https://hana.example',
      wsUrl: 'wss://hana.example',
      trustState: 'tunnel' as const,
      credentialKind: 'loopback_token' as const,
    };

    expect(() => validateSpaceConnectionTrust(invalidRemote))
      .toThrow('custom_remote connection must not use loopback_token');
  });

  it('rejects relay connections without official relay account context', () => {
    const invalidRelay = {
      ...createLocalServerConnection({
        serverPort: 3210,
        serverToken: 'local-token',
      })!,
      connectionId: 'relay:bad',
      kind: 'relay' as const,
      baseUrl: 'https://relay.hana.example',
      wsUrl: 'wss://relay.hana.example',
      trustState: 'tunnel' as const,
      credentialKind: 'user_session' as const,
      officialServiceKind: null,
      platformAccountId: null,
    };

    expect(() => validateSpaceConnectionTrust(invalidRelay))
      .toThrow('relay connection requires officialServiceKind=relay');
  });
});
