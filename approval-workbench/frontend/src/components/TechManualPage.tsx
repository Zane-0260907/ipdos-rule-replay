import React from 'react';
import { TechManual } from './TechManual';

export const TechManualPage: React.FC = () => {
  const [tab, setTab] = React.useState('predictions');
  const menuGroups: { title: string; items: { id: string; label: string }[] }[] = [
    { title: '如何使用', items: [
      { id: 'overview', label: '总览' },
      { id: 'predictions', label: '智能预测' },
    ]},
    { title: '快速上手', items: [
      { id: 'inventory', label: '库存管理' },
      { id: 'scheduling', label: '智能排班' },
    ]},
    { title: '其它', items: [
      { id: 'alerts', label: '智能预警' },
    ]},
  ];

  return (
    <div className="h-screen w-screen bg-white flex flex-col">
      {/* 顶部文档头 */}
      <div className="h-16 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-md" />
          <div className="font-semibold text-lg">技术手册</div>
          <div className="text-sm text-gray-500">API 文档 · 使用指南</div>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* 内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧目录 */}
        <aside className="w-72 border-r overflow-y-auto p-4">
          <div className="text-xs text-gray-500 mb-3">目录</div>
          <div className="space-y-4">
            {menuGroups.map(group => (
              <div key={group.title}>
                <div className="text-[11px] tracking-wider text-gray-400 uppercase mb-2">{group.title}</div>
                <div className="space-y-1">
                  {group.items.map(m => (
                    <button key={m.id}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${tab === m.id ? 'bg-gray-100 font-medium' : ''}`}
                      onClick={() => setTab(m.id)}
                    >{m.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* 文档正文 */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {/* 复用 TechManual 内容（内部自带 Tabs），此处仅占位整体风格 */}
          <TechManual />
        </main>
      </div>
    </div>
  );
};


