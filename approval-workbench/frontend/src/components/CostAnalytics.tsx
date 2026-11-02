import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendingDown, TrendingUp, DollarSign, Target, Calendar, Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetchBlob, ApiError, isUnauthorizedError } from '../utils/api';

// 模拟数据
const monthlyCostData = [
  { month: '3月', predicted: 8500, actual: 9200, saved: 700 },
  { month: '4月', predicted: 9100, actual: 9800, saved: 700 },
  { month: '5月', predicted: 8800, actual: 9600, saved: 800 },
  { month: '6月', predicted: 9200, actual: 10100, saved: 900 },
  { month: '7月', predicted: 8900, actual: 9700, saved: 800 },
  { month: '8月', predicted: 9300, actual: 10200, saved: 900 },
  { month: '9月', predicted: 8700, actual: 9500, saved: 800 }
];

const categoryDistribution = [
  { name: '肉类', value: 3500, color: '#0ea5e9' },
  { name: '蔬菜', value: 2200, color: '#10b981' },
  { name: '粮食', value: 1800, color: '#f59e0b' },
  { name: '调料', value: 800, color: '#ef4444' },
  { name: '其他', value: 700, color: '#8b5cf6' }
];

const weeklyTrendData = [
  { day: '周一', cost: 280, waste: 35, efficiency: 88 },
  { day: '周二', cost: 320, waste: 28, efficiency: 91 },
  { day: '周三', cost: 290, waste: 42, efficiency: 85 },
  { day: '周四', cost: 310, waste: 31, efficiency: 90 },
  { day: '周五', cost: 380, waste: 25, efficiency: 93 },
  { day: '周六', cost: 420, waste: 38, efficiency: 87 },
  { day: '周日', cost: 390, waste: 33, efficiency: 89 }
];

const supplierPerformance = [
  { name: '新发地批发', cost: 2800, quality: 92, delivery: 95 },
  { name: '华润万家', cost: 2200, quality: 88, delivery: 98 },
  { name: '蔬菜基地', cost: 1900, quality: 94, delivery: 87 },
  { name: '粮油批发', cost: 1600, quality: 90, delivery: 92 }
];

export const CostAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedStore, setSelectedStore] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const totalSaved = monthlyCostData.reduce((sum, item) => sum + item.saved, 0);
  const avgEfficiency = weeklyTrendData.reduce((sum, item) => sum + item.efficiency, 0) / weeklyTrendData.length;

  const buildReportPayload = () => ({
    monthlyCostData,
    categoryDistribution,
    weeklyTrendData,
    supplierPerformance,
    summary: {
      totalSaved,
      avgEfficiency,
      wasteRate: 3.2,
      forecastAccuracy: 94.5,
    },
  });

  const resolveDownloadError = (error: unknown) => {
    if (isUnauthorizedError(error)) {
      return '演示鉴权未通过，请检查令牌后再次导出。';
    }
    if (error instanceof ApiError) {
      return error.message;
    }
    return '成本报告下载失败，请稍后再试。';
  };

  const handleDownloadReport = async () => {
    if (isDownloading) {
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await apiFetchBlob('/cost/download-report', {
        method: 'POST',
        body: JSON.stringify(buildReportPayload()),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cost_Analytics_Report_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('成本分析报告下载成功！');
    } catch (error) {
      toast.error(resolveDownloadError(error));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 关键指标概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">累计节省成本</p>
                <p className="text-2xl font-bold text-green-600">¥{totalSaved}</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3" />
                  相比传统采购 -18%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">采购效率</p>
                <p className="text-2xl font-bold text-blue-600">{avgEfficiency.toFixed(0)}%</p>
                <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  本周提升 +5%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">浪费率</p>
                <p className="text-2xl font-bold text-orange-600">3.2%</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3" />
                  本月减少 -1.8%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">预测准确率</p>
                <p className="text-2xl font-bold text-purple-600">94.5%</p>
                <p className="text-xs text-purple-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  持续优化中
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">成本趋势</TabsTrigger>
            <TabsTrigger value="categories">品类分析</TabsTrigger>
            <TabsTrigger value="suppliers">供应商分析</TabsTrigger>
            <TabsTrigger value="efficiency">效率分析</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部门店</SelectItem>
                <SelectItem value="store1">朝阳店</SelectItem>
                <SelectItem value="store2">海淀店</SelectItem>
                <SelectItem value="store3">丰台店</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">近7天</SelectItem>
                <SelectItem value="30days">近30天</SelectItem>
                <SelectItem value="90days">近3个月</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <Download className="w-4 h-4 animate-spin" />
                  导出中…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出
                </>
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>月度成本对比趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyCostData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `¥${value}`,
                        name === 'predicted' ? '智能预测' : name === 'actual' ? '传统采购' : '节省金额'
                      ]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="actual" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="传统采购" />
                    <Area type="monotone" dataKey="predicted" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} name="智能预测" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>成本分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`¥${value}`, '金额']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>品类成本排行</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryDistribution
                    .sort((a, b) => b.value - a.value)
                    .map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">¥{category.value}</p>
                          <p className="text-xs text-gray-500">排名 #{index + 1}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>供应商绩效分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#0ea5e9" name="采购金额" />
                    <Bar dataKey="quality" fill="#10b981" name="质量评分" />
                    <Bar dataKey="delivery" fill="#f59e0b" name="交付评分" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>每日效率与浪费分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="efficiency" stroke="#0ea5e9" name="采购效率%" />
                    <Line type="monotone" dataKey="waste" stroke="#ef4444" name="浪费金额¥" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
