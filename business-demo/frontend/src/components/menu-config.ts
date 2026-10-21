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
  { id: 'dashboard', label: '智能预测', icon: BarChart3, badge: null, category: 'core' },
  { id: 'inventory', label: '库存管理', icon: Package, badge: null, category: 'core' },
  { id: 'staff', label: '智能排班', icon: UserCheck, badge: null, category: 'core' },
  { id: 'marketing', label: '智能营销', icon: Heart, badge: null, category: 'core' },
  { id: 'analytics', label: '成本分析', icon: TrendingUp, badge: null, category: 'analytics' },
  { id: 'decision', label: '决策支持', icon: Database, badge: null, category: 'analytics' },
  { id: 'alerts', label: '智能预警', icon: AlertTriangle, badge: null, category: 'monitoring' },
  { id: 'suppliers', label: '供应商', icon: Users, badge: null, category: 'management' },
  { id: 'orders', label: '订单记录', icon: FileText, badge: null, category: 'management' },
  { id: 'calendar', label: '采购日历', icon: Calendar, badge: null, category: 'management' },
];

export const ALL_MENU_IDS = MENU_ITEMS.map(i => i.id);


