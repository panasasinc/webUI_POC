export type HostStatus = 'online' | 'offline' | 'degraded';

export interface Host {
  id: string;
  name: string;
  ipAddress: string;
  status: HostStatus;
}
