import { useLocation, Link } from 'react-router';
import { AlertTriangle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useSystem } from '@/hooks/useSystem';
import { useState, useEffect } from 'react';

const routeLabels: Record<string, string> = {
  '/': 'Dashboards',
  '/volumes': 'File System > Volumes',
  '/pools': 'File System > Storage Pools',
  '/nodes': 'Cluster & Nodes > Realm Nodes',
  '/hosts': 'Storage Connectivity > Hosts',
  '/alerts': 'Monitoring > Alerts',
  '/help': 'Get Help',
  '/about': 'About Product',
};

export function Header() {
  const location = useLocation();
  const { data: alerts } = useAlerts({ status: 'active' });
  const { data: system } = useSystem();
  const activeCount = alerts?.length ?? 0;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const breadcrumb = routeLabels[location.pathname] ?? 'Dashboards';
  const realmName = system?.clusterName ?? 'vdura-realm';

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-5">
      <div className="flex items-center gap-3">
        {location.pathname !== '/' && (
          <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm text-muted-foreground">{breadcrumb}</span>
      </div>
      <div className="flex items-center gap-5">
        {activeCount > 0 && (
          <Link to="/alerts" className="flex items-center gap-1.5 text-vdura-amber hover:text-vdura-amber-light">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{activeCount}</span>
          </Link>
        )}
        <span className="text-sm text-muted-foreground">{realmName}</span>
        <div className="flex items-center gap-1 text-sm text-foreground">
          <span>Admin</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </header>
  );
}
