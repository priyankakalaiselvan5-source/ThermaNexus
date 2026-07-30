import { NavItem } from '@/types';

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Shipments', href: '/shipments', icon: 'Package' },
  { label: 'Live Tracking', href: '/tracking', icon: 'Navigation' },
  { label: 'Live Map', href: '/map', icon: 'Map' },
  { label: 'AI Prediction Center', href: '/predictions', icon: 'BrainCircuit' },
  { label: 'Risk & Safety Monitor', href: '/risk-monitor', icon: 'ShieldAlert' },
  { label: 'Emergency Rescue', href: '/emergency', icon: 'Siren', badge: 'active' },
  { label: 'Alerts', href: '/alerts', icon: 'BellRing', badge: 'new' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  { label: 'Reports', href: '/reports', icon: 'FileText' },
  { label: 'Fleet', href: '/fleet', icon: 'Truck' },
  { label: 'Drivers', href: '/drivers', icon: 'Users' },
  { label: 'Hospitals', href: '/hospitals', icon: 'Building2' },
  { label: 'Warehouses', href: '/warehouses', icon: 'Warehouse' },
  { label: 'Cold Storage', href: '/cold-storage', icon: 'Snowflake' },
  { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Support', href: '/support', icon: 'LifeBuoy' },
];

export const DISPATCHER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dispatcher', icon: 'LayoutDashboard' },
  { label: 'Shipments', href: '/shipments', icon: 'Package' },
  { label: 'Drivers', href: '/drivers', icon: 'Users' },
  { label: 'Live Tracking', href: '/tracking', icon: 'Navigation' },
  { label: 'Live Map', href: '/map', icon: 'Map' },
  { label: 'Alerts', href: '/alerts', icon: 'BellRing', badge: 'new' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  { label: 'Reports', href: '/reports', icon: 'FileText' },
  { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Support', href: '/support', icon: 'LifeBuoy' },
];

export const DRIVER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/driver', icon: 'LayoutDashboard' },
  { label: 'My Shipments', href: '/driver/shipments', icon: 'Package' },
  { label: 'Navigation', href: '/driver/navigation', icon: 'Navigation' },
  { label: 'Temperature Status', href: '/driver/temperature', icon: 'Thermometer' },
  { label: 'QR Scanner', href: '/driver/qr-scanner', icon: 'QrCode' },
  { label: 'Delivery History', href: '/driver/history', icon: 'History' },
  { label: 'Emergency', href: '/driver/emergency', icon: 'Siren', badge: 'active' },
  { label: 'Profile', href: '/driver/profile', icon: 'User' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

export const HOSPITAL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/hospital', icon: 'LayoutDashboard' },
  { label: 'Incoming Shipments', href: '/hospital/incoming', icon: 'Package' },
  { label: 'Received Medicines', href: '/hospital/received', icon: 'CheckCircle2' },
  { label: 'Temperature Certificates', href: '/hospital/certificates', icon: 'FileText' },
  { label: 'Inventory', href: '/hospital/inventory', icon: 'Boxes' },
  { label: 'Alerts', href: '/alerts', icon: 'BellRing', badge: 'new' },
  { label: 'Documents', href: '/hospital/documents', icon: 'FolderOpen' },
  { label: 'Reports', href: '/reports', icon: 'BarChart3' },
  { label: 'Notifications', href: '/notifications', icon: 'Bell' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Support', href: '/support', icon: 'LifeBuoy' },
];

export function getNavForRole(role: string): NavItem[] {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'administrator': return ADMIN_NAV;
    case 'dispatcher': return DISPATCHER_NAV;
    case 'driver': return DRIVER_NAV;
    case 'hospital': return HOSPITAL_NAV;
    default: return ADMIN_NAV;
  }
}

// Kept for backward compatibility (header search, etc.)
export const NAV_ITEMS = ADMIN_NAV;

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
];

export const MEDICINE_TYPES = ['vaccine', 'biologic', 'insulin', 'blood_product', 'chemotherapy', 'antibiotic'];

export const ROLE_DASHBOARD_HREF: Record<string, string> = {
  administrator: '/admin',
  dispatcher: '/dispatcher',
  driver: '/driver',
  hospital: '/hospital',
};
