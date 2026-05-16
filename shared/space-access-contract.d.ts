export type SpaceConnectionKind = 'local' | 'lan' | 'custom_remote' | 'relay' | 'cloud';
export type ServerTrustState = 'local' | 'lan' | 'tunnel' | 'cloud';
export type ConnectionCredentialKind = 'none' | 'loopback_token' | 'device_credential' | 'user_session';
export type OfficialServiceKind = 'relay' | 'cloud_space' | 'inference' | 'billing';

export type SpaceConnectionTransport =
  | 'loopback'
  | 'trusted_lan'
  | 'user_managed_tunnel'
  | 'official_relay'
  | 'official_cloud';

export type SpaceAccessActorKind =
  | 'anonymous'
  | 'local_user'
  | 'device'
  | 'platform_account';

export type SpaceAccessDataOwner = 'user_server' | 'hana_cloud_space';

export type SpaceAccessCapability =
  | 'chat'
  | 'resources.read'
  | 'resources.write'
  | 'files.openLocal'
  | 'tools.run'
  | 'plugins.use'
  | 'settings.read'
  | 'settings.write';

export interface SpaceConnectionProfile {
  kind: SpaceConnectionKind;
  transport: SpaceConnectionTransport;
  credentialKinds: ConnectionCredentialKind[];
  trustState: ServerTrustState;
  remoteReachable: boolean;
  requiresDevicePairing: boolean;
  requiresPlatformAccount: boolean;
  dataOwner: SpaceAccessDataOwner;
  officialServiceKind: OfficialServiceKind | null;
}

export interface SpaceAccessConnection {
  connectionId: string;
  kind: SpaceConnectionKind;
  serverId: string;
  userId?: string;
  spaceId: string;
  baseUrl: string;
  wsUrl: string;
  token: string | null;
  authState: string;
  trustState: ServerTrustState;
  credentialKind: ConnectionCredentialKind;
  platformAccountId?: string | null;
  officialServiceKind?: OfficialServiceKind | null;
  capabilities: string[];
}

export interface SpaceAccessGrant {
  grantId: string;
  connectionId: string;
  actorKind: SpaceAccessActorKind;
  scope: {
    serverId: string;
    userId: string | null;
    spaceId: string;
  };
  transport: SpaceConnectionTransport;
  dataOwner: SpaceAccessDataOwner;
  localOnly: boolean;
  capabilities: SpaceAccessCapability[];
}

export const SPACE_ACCESS_CAPABILITIES: readonly SpaceAccessCapability[];
export function getSpaceConnectionProfile(kind: SpaceConnectionKind): SpaceConnectionProfile;
export function validateSpaceConnectionTrust(connection: SpaceAccessConnection): void;
export function deriveSpaceAccessGrant(connection: SpaceAccessConnection): SpaceAccessGrant;
