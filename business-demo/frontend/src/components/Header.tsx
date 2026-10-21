import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, Settings, User, BarChart3, Menu, Sun, Moon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
  onMenuClick?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  sidebarCollapsed = false, 
  isMobile = false,
  onMenuClick,
  onOpenSettings,
  onLogout,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 从localStorage读取主题设置
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  return (
    <header className="transition-colors duration-200" style={{ 
      paddingLeft: '24px', 
      paddingRight: '24px',
      backgroundColor: 'var(--background)',
      borderBottom: '1px solid var(--border)',
      paddingTop: '8px',
      paddingBottom: '8px',
      position: 'relative',
      zIndex: 10,
      flexShrink: 0
    }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4" style={{ minWidth: '400px', justifyContent: 'flex-start' }}>
          {/* 移动端菜单按钮 */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMenuClick}
              className="p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-8">
            <img src="/logo.svg" alt="氢云智能餐饮" style={{ height: '48px', width: 'auto', transform: 'scale(1.8)', marginLeft: '30px' }} />
            <h1 className="text-lg md:text-xl font-bold whitespace-nowrap" style={{ marginLeft: '40px', color: 'var(--foreground)' }}>
              {isMobile ? '氢云智能餐饮' : '氢云智能餐饮成本管理系统'}
            </h1>
          </div>
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hidden sm:inline-flex">
            演示版
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* 桌面端用户信息 */}
          {!isMobile && (
            <div className="text-right">
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>合成演示门店</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>本地隔离 · 模拟采购</p>
            </div>
          )}
          
          <div className="flex items-center gap-1 md:gap-2">
            <Button disabled title="通知未接通" variant="ghost" size="sm" className="p-2 transition-colors" style={{ color: 'var(--muted-foreground)' }}>
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 transition-colors" onClick={onOpenSettings} style={{ color: 'var(--muted-foreground)' }}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 transition-colors" 
              onClick={toggleTheme}
              title={isDarkMode ? '切换到日间模式' : '切换到夜间模式'}
              style={{ color: 'var(--muted-foreground)' }}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2 transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={8}>
                <DropdownMenuItem onClick={onLogout} variant="destructive">退出登录</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};