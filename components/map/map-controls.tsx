'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Maximize2, Minimize2, Route as RouteIcon, Building2, Truck, Snowflake,
  Play, Pause, RotateCcw, Layers, RefreshCw,
} from 'lucide-react';

interface MapControlsProps {
  showRoutes: boolean;
  showCities: boolean;
  showTrucks: boolean;
  showWarehouses: boolean;
  fullscreen: boolean;
  isRunning: boolean;
  autoRefresh?: boolean;
  lastRefresh?: Date;
  onToggleRoutes: () => void;
  onToggleCities: () => void;
  onToggleTrucks: () => void;
  onToggleWarehouses: () => void;
  onToggleFullscreen: () => void;
  onToggleRunning: () => void;
  onReset: () => void;
  onToggleAutoRefresh?: () => void;
}

function ToggleButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'gradient-primary text-white shadow-glow'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function MapControls({
  showRoutes, showCities, showTrucks, showWarehouses, fullscreen, isRunning,
  autoRefresh, lastRefresh,
  onToggleRoutes, onToggleCities, onToggleTrucks, onToggleWarehouses, onToggleFullscreen,
  onToggleRunning, onReset, onToggleAutoRefresh,
}: MapControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="hidden text-xs font-semibold text-muted-foreground md:inline">Layers:</span>
      </div>
      <ToggleButton active={showTrucks} onClick={onToggleTrucks} icon={Truck} label="Trucks" />
      <ToggleButton active={showWarehouses} onClick={onToggleWarehouses} icon={Snowflake} label="Cold Storage" />
      <ToggleButton active={showRoutes} onClick={onToggleRoutes} icon={RouteIcon} label="Routes" />
      <ToggleButton active={showCities} onClick={onToggleCities} icon={Building2} label="Cities" />

      <div className="mx-1 h-5 w-px bg-border" />

      <button
        onClick={onToggleRunning}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
          isRunning ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground hover:bg-muted/70'
        )}
      >
        {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{isRunning ? 'Live' : 'Paused'}</span>
      </button>

      {onToggleAutoRefresh && (
        <button
          onClick={onToggleAutoRefresh}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            autoRefresh ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
          title={autoRefresh ? 'Auto Refresh ON (every 5s)' : 'Auto Refresh OFF'}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', autoRefresh && 'animate-spin')} style={{ animationDuration: '3s' }} />
          <span className="hidden sm:inline">{autoRefresh ? 'Auto: ON' : 'Auto: OFF'}</span>
        </button>
      )}

      <button
        onClick={onReset}
        className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/70"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Reset</span>
      </button>

      {autoRefresh && lastRefresh && (
        <span className="text-[10px] text-muted-foreground hidden md:inline">
          Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}

      <div className="ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          className="gap-1.5"
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </Button>
      </div>
    </div>
  );
}
