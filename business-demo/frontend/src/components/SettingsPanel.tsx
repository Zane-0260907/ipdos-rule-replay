import React from 'react';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MENU_ITEMS } from './menu-config';
import { toast } from 'sonner';

interface SettingsPanelProps {
  visibleMenuIds: string[];
  onChangeVisibleMenuIds: (next: string[]) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ visibleMenuIds, onChangeVisibleMenuIds }) => {
  const toggleId = (id: string, checked: boolean) => {
    if (!checked && visibleMenuIds.length === 1 && visibleMenuIds[0] === id) {
      toast.warning('至少保留一个模块');
      return;
    }
    const next = checked
      ? Array.from(new Set([...visibleMenuIds, id]))
      : visibleMenuIds.filter((x) => x !== id);
    onChangeVisibleMenuIds(next);
    localStorage.setItem('visibleMenuIds', JSON.stringify(next));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">系统设置</h2>

      <Card>
        <CardHeader>
          <CardTitle>界面与导航</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">选择需要在左侧显示的功能模块：</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {MENU_ITEMS.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    className="size-5 rounded border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    checked={visibleMenuIds.includes(item.id)}
                    onCheckedChange={(v: boolean) => toggleId(item.id, v)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>其他设置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">预留更多配置项（主题、通知、导出偏好等）。</p>
        </CardContent>
      </Card>
    </div>
  );
};


