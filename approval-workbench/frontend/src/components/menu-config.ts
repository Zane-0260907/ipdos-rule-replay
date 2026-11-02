import { 
  BarChart3,
  Package,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Calendar,
  UserCheck,
  Heart,
  Database,
} from 'lucide-react';

export interface MenuItemConfig {
  id: string;
  label: string;
  icon: any;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' } | null;
  category: 'core' | 'analytics' | 'monitoring' | 'management';
}

export const MENU_ITEMS: MenuItemConfig[] = [
  { id: 'dashboard', label: 'Demand Forecast', icon: BarChart3, badge: null, category: 'core' },
  { id: 'inventory', label: 'Inventory', icon: Package, badge: null, category: 'core' },
  { id: 'staff', label: 'Staff Scheduling', icon: UserCheck, badge: null, category: 'core' },
  { id: 'marketing', label: 'Marketing', icon: Heart, badge: null, category: 'core' },
  { id: 'analytics', label: 'Cost Analysis', icon: TrendingUp, badge: null, category: 'analytics' },
  { id: 'decision', label: 'Decision Support', icon: Database, badge: null, category: 'analytics' },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: null, category: 'monitoring' },
  { id: 'suppliers', label: 'Suppliers', icon: Users, badge: null, category: 'management' },
  { id: 'orders', label: 'Order Records', icon: FileText, badge: null, category: 'management' },
  { id: 'calendar', label: 'Procurement Calendar', icon: Calendar, badge: null, category: 'management' },
];

export const ALL_MENU_IDS = MENU_ITEMS.map(i => i.id);


