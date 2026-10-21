import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  FileText, 
  Settings,
  AlertTriangle,
  Calendar,
  Target,
  UserCheck,
  Heart,
  Database,
  Zap,
  GripVertical
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  isMobile?: boolean;
  onMenuReorder?: (reorderedItems: any[]) => void;
  visibleMenuIds?: string[];
  disabled?: boolean;
}

interface SortableMenuItemProps {
  item: any;
  isActive: boolean;
  collapsed: boolean;
  isMobile: boolean;
  onTabChange: (tabId: string) => void;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({ item, isActive, collapsed, isMobile, onTabChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: collapsed // 收缩状态下禁用拖拽
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = item.icon as any;

  return (
    <div ref={setNodeRef} style={style} className="draggable-item">
      <Button
        variant={isActive ? "default" : "ghost"}
        className={`w-full ${
          isMobile 
            ? 'justify-start h-12 px-3' 
            : collapsed 
              ? 'justify-center h-12 p-0' 
              : 'justify-start h-12 px-3'
        } ${isActive ? 'bg-blue-600 text-white' : ''} ${
          isDragging ? 'shadow-lg' : ''
        } transition-colors duration-200`}
        style={{
          color: isActive ? 'white' : 'var(--foreground)',
          backgroundColor: isActive ? '#2563eb' : 'transparent'
        }}
        onClick={() => onTabChange(item.id)}
        title={collapsed && !isMobile ? item.label : undefined}
      >
        {/* 拖拽手柄 - 收缩状态下隐藏 */}
        {!collapsed && (
          <div 
            {...attributes}
            {...listeners}
            className={`drag-handle ${
              isMobile 
                ? 'mr-2' 
                : 'mr-2'
            }`}
          >
            <GripVertical className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
          </div>
        )}
        
        {IconComponent && React.createElement(IconComponent, {
          className: `w-5 h-5 ${isMobile ? 'mr-3' : collapsed ? '' : 'mr-3'}`
        })}
        {(!collapsed || isMobile) && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant={item.badge.variant} className="ml-2 text-xs">
                {item.badge.text}
              </Badge>
            )}
          </>
        )}
      </Button>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, collapsed, isMobile = false, onMenuReorder, visibleMenuIds, disabled }) => {
  const defaultMenuItems = [
    {
      id: 'dashboard',
      label: '智能预测',
      icon: BarChart3,
      badge: null,
      category: 'core'
    },
    {
      id: 'inventory',
      label: '库存管理',
      icon: Package,
      badge: null,
      category: 'core'
    },
    {
      id: 'staff',
      label: '智能排班',
      icon: UserCheck,
      badge: null,
      category: 'core'
    },
    {
      id: 'marketing',
      label: '智能营销',
      icon: Heart,
      badge: null,
      category: 'core'
    },
    {
      id: 'analytics',
      label: '成本分析',
      icon: TrendingUp,
      badge: null,
      category: 'analytics'
    },
    {
      id: 'decision',
      label: '决策支持',
      icon: Database,
      badge: null,
      category: 'analytics'
    },
    {
      id: 'alerts',
      label: '智能预警',
      icon: AlertTriangle,
      badge: null,
      category: 'monitoring'
    },
    {
      id: 'suppliers',
      label: '供应商',
      icon: Users,
      badge: null,
      category: 'management'
    },
    {
      id: 'orders',
      label: '订单记录',
      icon: FileText,
      badge: null,
      category: 'management'
    },
    {
      id: 'calendar',
      label: '采购日历',
      icon: Calendar,
      badge: null,
      category: 'management'
    }
  ];

  // 从localStorage加载保存的菜单顺序（仅保存ID顺序，避免序列化图标组件）
  const [menuItems, setMenuItems] = useState(() => {
    const savedOrder = localStorage.getItem('menuOrder');
    if (savedOrder) {
      try {
        const parsedIds = JSON.parse(savedOrder);
        if (Array.isArray(parsedIds) && parsedIds.length === defaultMenuItems.length) {
          const mapped = parsedIds
            .map((id: string) => defaultMenuItems.find((it) => it.id === id))
            .filter(Boolean);
          if (mapped.length === defaultMenuItems.length) {
            return mapped as typeof defaultMenuItems;
          }
        }
      } catch (error) {
        console.warn('Failed to parse saved menu order:', error);
      }
    }
    return defaultMenuItems;
  });

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    // 移动端选择菜单项后自动收起侧边栏
    if (isMobile) {
      // 这里需要从父组件传递收起函数，暂时先这样
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // 仅保存ID顺序，避免序列化组件
        localStorage.setItem('menuOrder', JSON.stringify(newItems.map((i) => i.id)));
        if (onMenuReorder) onMenuReorder(newItems);
        return newItems;
      });
    }
  };

  const handleResetOrder = () => {
    setMenuItems(defaultMenuItems);
    localStorage.setItem('menuOrder', JSON.stringify(defaultMenuItems.map((i) => i.id)));
    if (onMenuReorder) onMenuReorder(defaultMenuItems);
  };

  return (
    <div className={`${
      isMobile 
        ? 'w-64' 
        : collapsed 
          ? 'w-16' 
          : 'w-64'
    } h-full overflow-y-auto transition-all duration-300`} style={{ 
      backgroundColor: 'var(--background)',
      borderRight: '1px solid var(--border)'
    }}>
      <div className={`${
        isMobile 
          ? 'p-4' 
          : collapsed 
            ? 'p-2' 
            : 'p-6'
      }`}>
        <DndContext
          sensors={sensors} // 传感器数组保持稳定，避免 useEffect 依赖变更告警
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={menuItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {menuItems
                .filter(item => !visibleMenuIds || visibleMenuIds.includes(item.id))
                .map((item) => (
                <SortableMenuItem
                  key={item.id}
                  item={item}
                  isActive={activeTab === item.id}
                  collapsed={collapsed}
                  isMobile={isMobile}
                  onTabChange={handleTabChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      {/* 底部信息 - 移动端隐藏 */}
      {!isMobile && (
        <div className={`absolute bottom-0 left-0 right-0 ${collapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500 hover:text-gray-700"
              onClick={handleResetOrder}
              title="重置菜单顺序"
            >
              重置顺序
            </Button>
          )}
        </div>
      )}
    </div>
  );
};