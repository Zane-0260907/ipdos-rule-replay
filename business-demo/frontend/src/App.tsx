import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ALL_MENU_IDS } from './components/menu-config';
import { SettingsPanel } from './components/SettingsPanel';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './styles/drag.css';
import { BusinessProvider, BusinessPrediction, BusinessInventory, BusinessOrders, UnconnectedPage } from './components/BusinessFlow';
import { businessApi } from './utils/business-api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOrder, setMenuOrder] = useState<any[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleMenuIds, setVisibleMenuIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('visibleMenuIds');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length > 0) return ids;
      } catch {}
    }
    return ALL_MENU_IDS;
  });
  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem('businessToken')));

  // 监听窗口大小变化
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuReorder = (reorderedItems: any[]) => {
    setMenuOrder(reorderedItems);
    // 可以在这里保存到localStorage或发送到服务器
    localStorage.setItem('menuOrder', JSON.stringify(reorderedItems));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsPanel
            visibleMenuIds={visibleMenuIds}
            onChangeVisibleMenuIds={setVisibleMenuIds}
          />
        );
      case 'dashboard':
        return <BusinessPrediction />;
      case 'inventory':
        return <BusinessInventory />;
      case 'staff':
        return <UnconnectedPage label="智能排班" />;
      case 'marketing':
        return <UnconnectedPage label="智能营销" />;
      case 'analytics':
        return <UnconnectedPage label="成本分析" />;
      case 'decision':
        return <UnconnectedPage label="决策支持" />;
      case 'alerts':
        return <UnconnectedPage label="智能预警" />;
      case 'suppliers':
        return (
          <div className="p-6">
            <h2>供应商管理</h2>
            <p>供应商管理功能开发中...</p>
          </div>
        );
      case 'orders':
        return <BusinessOrders />;
      case 'calendar':
        return (
          <div className="p-6">
            <h2>采购日历</h2>
            <p>采购日历功能开发中...</p>
          </div>
        );
      case 'manual':
        return <UnconnectedPage label="技术手册" />;
      default:
        return <BusinessPrediction />;
    }
  };

  if (!authed) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-white rounded-xl shadow-lg p-10 max-w-lg space-y-5">
      <h1 className="text-2xl font-bold">智能餐饮成本管家</h1><p>本地合成业务流程 · 模拟采购</p><p className="text-sm text-gray-500">选择演示角色以体验不同权限。这是本机演示入口，不是生产身份认证。</p>
      {(['manager', 'viewer'] as const).map(role => <Button key={role} className="w-full" onClick={async () => {
        try { const result = await businessApi<any>('/auth/login', { method: 'POST', body: JSON.stringify({ role }) }); sessionStorage.setItem('businessToken', result.token); sessionStorage.setItem('businessRole', role); setAuthed(true); }
        catch (error) { alert(error instanceof Error ? error.message : '登录失败'); }
      }}>{role === 'manager' ? '进入模拟店长（可审阅与确认）' : '进入模拟观察员（只读）'}</Button>)}
    </div></div>;
  }

  return (
    <>
    <BusinessProvider><div className="h-screen flex flex-col overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--background)' }}>
      <Header 
        sidebarCollapsed={sidebarCollapsed} 
        isMobile={isMobile}
        onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={() => {
          sessionStorage.removeItem('businessToken'); sessionStorage.removeItem('businessRole');
          setAuthed(false);
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* 移动端遮罩层 */}
        {isMobile && !sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        
        <div
          className={`fixed left-0 top-16 h-[calc(100vh-64px)] z-30 transition-all duration-300 ${
            isMobile ? (sidebarCollapsed ? '-translate-x-full' : 'translate-x-0') : ''
          }`}
          style={
            isMobile
              ? {
                  transform: sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                }
              : undefined
          }
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (isMobile) {
                setSidebarCollapsed(true);
              }
            }}
            collapsed={sidebarCollapsed}
            isMobile={isMobile}
            onMenuReorder={handleMenuReorder}
            visibleMenuIds={visibleMenuIds}
            disabled={!authed}
          />
        </div>

        {/* 收起/展开按钮 - 移动端优化 */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`fixed top-20 z-20 w-6 h-8 p-0 shadow-sm transition-all duration-300 rounded-r-md rounded-l-none ${
              sidebarCollapsed ? 'left-16' : 'left-64'
            }`}
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)'
            }}
            title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </Button>
        )}

        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isMobile 
            ? 'p-4 ml-0' 
            : sidebarCollapsed 
              ? 'p-6 ml-16' 
              : 'p-6 ml-64'
        }`}>
          {renderContent()}
        </main>
      </div>

      {/* 已移除弹窗设置，改为右侧主内容页 */}
    </div>
    <Toaster />
    </BusinessProvider></>
  );
}
