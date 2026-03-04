import type {
  Volume, CreateVolumeRequest, Pool, Host, Alert,
  PerformanceSummary, SystemInfo,
} from '@vdura/shared';

export interface IVolumeService {
  getAll(): Promise<Volume[]>;
  getById(id: string): Promise<Volume | undefined>;
  create(req: CreateVolumeRequest): Promise<Volume>;
  delete(id: string): Promise<boolean>;
}

export interface IPoolService {
  getAll(): Promise<Pool[]>;
  getById(id: string): Promise<Pool | undefined>;
}

export interface IHostService {
  getAll(): Promise<Host[]>;
  getById(id: string): Promise<Host | undefined>;
}

export interface IAlertService {
  getAll(filters?: { severity?: string; status?: string }): Promise<Alert[]>;
  acknowledge(id: string): Promise<Alert | undefined>;
}

export interface IPerformanceService {
  getSummary(intervalMs?: number): Promise<PerformanceSummary>;
}

export interface ISystemService {
  getInfo(): Promise<SystemInfo>;
}

export interface ServiceRegistry {
  volumes: IVolumeService;
  pools: IPoolService;
  hosts: IHostService;
  alerts: IAlertService;
  performance: IPerformanceService;
  system: ISystemService;
}
