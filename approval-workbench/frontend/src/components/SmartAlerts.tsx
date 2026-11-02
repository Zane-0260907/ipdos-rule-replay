import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  AlertTriangle, 
  Bell, 
  Clock, 
  TrendingDown, 
  Package, 
  DollarSign,
  Calendar,
  MapPin,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const alertsData = [
  {
    id: 1,
    type: 'inventory',
    level: 'critical',
    title: '鸡胸肉库存严重不足',
    description: '当前库存5.5kg，低于安全库存10kg，建议立即补货',
    time: '5分钟前',
    action: '立即订货',
    resolved: false,
    autoAction: true
  },
  {
    id: 2,
    type: 'cost',
    level: 'warning',
    title: '土豆采购价格上涨',
    description: '供应商报价上涨15%，建议寻找替代供应商',
    time: '1小时前',
    action: '查看替代方案',
    resolved: false,
    autoAction: false
  },
  {
    id: 3,
    type: 'waste',
    level: 'info',
    title: '青椒预计过期提醒',
    description: '3.8kg青椒将在2天后过期，建议优先使用或促销',
    time: '2小时前',
    action: '制定消耗计划',
    resolved: false,
    autoAction: true
  },
  {
    id: 4,
    type: 'demand',
    level: 'info',
    title: '周末需求预测上升',
    description: '基于历史数据和天气预报，预计周末客流增加20%',
    time: '4小时前',
    action: '调整订货计划',
    resolved: true,
    autoAction: true
  },
  {
    id: 5,
    type: 'supplier',
    level: 'warning',
    title: '供应商交付延迟',
    description: '新发地批发预计延迟1天交付，可能影响明日营业',
    time: '6小时前',
    action: '联系备用供应商',
    resolved: false,
    autoAction: false
  }
];

const alertSettings = [
  {
    id: 'inventory_low',
    title: '库存不足预警',
    description: '当库存低于安全库存时提醒',
    enabled: true,
    autoAction: true
  },
  {
    id: 'price_change',
    title: '价格变动提醒',
    description: '供应商价格变动超过10%时通知',
    enabled: true,
    autoAction: false
  },
  {
    id: 'expiry_warning',
    title: '临期商品提醒',
    description: '商品即将过期前3天提醒',
    enabled: true,
    autoAction: true
  },
  {
    id: 'demand_forecast',
    title: '需求异常预警',
    description: '预测需求变动超过20%时通知',
    enabled: true,
    autoAction: true
  },
  {
    id: 'supplier_issue',
    title: '供应商问题提醒',
    description: '供应商交付或质量问题通知',
    enabled: true,
    autoAction: false
  }
];

const getAlertInfo = (level: string, type: string) => {
  const levelInfo = {
    critical: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle, variant: 'destructive' as const },
    warning: { color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle, variant: 'default' as const },
    info: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Bell, variant: 'secondary' as const }
  };

  const typeInfo = {
    inventory: { label: '库存', icon: Package },
    cost: { label: '成本', icon: DollarSign },
    waste: { label: '浪费', icon: TrendingDown },
    demand: { label: '需求', icon: Calendar },
    supplier: { label: '供应商', icon: MapPin }
  };

  return {
    level: levelInfo[level as keyof typeof levelInfo] || levelInfo.info,
    type: typeInfo[type as keyof typeof typeInfo] || typeInfo.inventory
  };
};

export const SmartAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState(alertsData);
  const [settings, setSettings] = useState(alertSettings);
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');

  const handleResolveAlert = (alertId: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    toast.success('预警已处理');
  };

  const handleDismissAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success('预警已忽略');
  };

  const handleSettingChange = (settingId: string, field: 'enabled' | 'autoAction', value: boolean) => {
    setSettings(prev => prev.map(setting =>
      setting.id === settingId ? { ...setting, [field]: value } : setting
    ));
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical');

  return (
    <div className="space-y-6">
      {/* 预警概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">紧急预警</p>
                <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">活跃预警</p>
                <p className="text-2xl font-bold text-orange-600">{activeAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">今日处理</p>
                <p className="text-2xl font-bold text-blue-600">{alerts.filter(a => a.resolved).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Check className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">自动处理率</p>
                <p className="text-2xl font-bold text-green-600">78%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-4 border-b">
        <Button
          variant={activeTab === 'alerts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('alerts')}
          className="rounded-b-none"
        >
          智能预警
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
          className="rounded-b-none"
        >
          预警设置
        </Button>
      </div>

      {activeTab === 'alerts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              实时预警列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => {
                const alertInfo = getAlertInfo(alert.level, alert.type);
                const LevelIcon = alertInfo.level.icon;
                const TypeIcon = alertInfo.type.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${alertInfo.level.bg} ${alert.resolved ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <LevelIcon className={`w-5 h-5 ${alertInfo.level.color}`} />
                          <TypeIcon className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant={alertInfo.level.variant} className="text-xs">
                              {alertInfo.type.label}
                            </Badge>
                            {alert.autoAction && (
                              <Badge variant="outline" className="text-xs">
                                自动处理
                              </Badge>
                            )}
                            {alert.resolved && (
                              <Badge variant="secondary" className="text-xs">
                                已处理
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.time}
                          </p>
                        </div>
                      </div>
                      
                      {!alert.resolved && (
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleResolveAlert(alert.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {alert.action}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDismissAlert(alert.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              预警规则设置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{setting.title}</h4>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={setting.autoAction}
                        onCheckedChange={(checked) => handleSettingChange(setting.id, 'autoAction', checked)}
                        disabled={!setting.enabled}
                      />
                      <span className="text-sm text-gray-600">自动处理</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={setting.enabled}
                        onCheckedChange={(checked) => handleSettingChange(setting.id, 'enabled', checked)}
                      />
                      <span className="text-sm font-medium">启用</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};