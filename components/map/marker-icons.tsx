export function TruckIcon(color: string, emergency?: boolean): string {
  const pulseClass = emergency ? 'truck-emergency-pulse' : 'truck-pulse';
  const size = emergency ? 36 : 32;
  const innerSize = emergency ? 28 : 24;
  const offset = emergency ? 4 : 4;
  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      <div style="
        position: absolute; inset: 0; border-radius: 50%;
        background: ${color}; opacity: 0.3;
        animation: ${pulseClass} ${emergency ? '1s' : '2s'} ease-in-out infinite;
      "></div>
      ${emergency ? '<div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid #ef4444; opacity: 0.6; animation: emergency-ring 1.2s ease-out infinite;"></div>' : ''}
      <div style="
        position: absolute; top: ${offset}px; left: ${offset}px;
        width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%;
        background: ${color}; display: flex; align-items: center; justify-content: center;
        border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 17h4V5H2v12h3"/>
          <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
          <path d="M14 17h-4"/>
          <circle cx="7.5" cy="17.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>
    </div>
  `;
}

export function WarehouseIcon(color: string, highlighted?: boolean): string {
  const size = highlighted ? 36 : 30;
  const inner = highlighted ? 28 : 22;
  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${highlighted ? '<div style="position: absolute; inset: -6px; border-radius: 50%; background: #3b82f6; opacity: 0.15; animation: warehouse-pulse 1.5s ease-in-out infinite;"></div>' : ''}
      <div style="
        position: absolute; top: ${(size - inner) / 2}px; left: ${(size - inner) / 2}px;
        width: ${inner}px; height: ${inner}px; border-radius: 50%;
        background: ${color}; display: flex; align-items: center; justify-content: center;
        border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <svg width="${highlighted ? 16 : 13}" height="${highlighted ? 16 : 13}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
          <line x1="12" y1="5" x2="9" y2="8"/>
          <line x1="12" y1="5" x2="15" y2="8"/>
          <line x1="12" y1="19" x2="9" y2="16"/>
          <line x1="12" y1="19" x2="15" y2="16"/>
        </svg>
      </div>
    </div>
  `;
}

export function CityIcon(color: string, type: string): string {
  const symbol =
    type === 'warehouse'
      ? '<path d="M3 21V8l9-4 9 4v13"/><path d="M9 21v-6h6v6"/>'
      : type === 'hospital'
      ? '<path d="M12 5v14M5 12h14"/>'
      : type === 'hub'
      ? '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'
      : '<rect x="4" y="4" width="16" height="16" rx="2"/>';
  return `
    <div style="position: relative; width: 28px; height: 28px;">
      <div style="
        position: absolute; top: 0; left: 0;
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: ${color}; transform: rotate(-45deg);
        border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position: absolute; top: 0; left: 0;
        width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
        transform: rotate(45deg);
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${symbol}
        </svg>
      </div>
    </div>
  `;
}
