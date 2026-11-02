import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { TrendingDown, TrendingUp, Eye, ShoppingCart, Calendar, MapPin, CloudRain, Info, Users, Clock, Thermometer, Wind, Droplets, Sun, Navigation, Settings, BarChart3 } from 'lucide-react';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Calendar as CalendarComponent } from './ui/calendar';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';

// 模拟数据
const mockPredictionData = [
  {
    id: 1,
    ingredient: '土豆',
    predictedAmount: 25.5,
    unit: 'kg',
    currentStock: 8.2,
    experienceAmount: 35.0,
    factors: ['周六客流(+20%)', '附近体育馆活动(+15%)'],
    historicalData: [
      { day: '周一', amount: 18.5 },
      { day: '周二', amount: 22.0 },
      { day: '周三', amount: 19.8 },
      { day: '周四', amount: 21.5 },
      { day: '周五', amount: 28.2 },
      { day: '周六', amount: 32.1 },
      { day: '周日', amount: 26.8 }
    ]
  },
  {
    id: 2,
    ingredient: '鸡胸肉',
    predictedAmount: 18.8,
    unit: 'kg',
    currentStock: 5.5,
    experienceAmount: 25.0,
    factors: ['天气晴朗(+8%)', '学生返校(-5%)'],
    historicalData: [
      { day: '周一', amount: 15.2 },
      { day: '周二', amount: 17.8 },
      { day: '周三', amount: 16.5 },
      { day: '周四', amount: 18.2 },
      { day: '周五', amount: 21.5 },
      { day: '周六', amount: 19.8 },
      { day: '周日', amount: 17.2 }
    ]
  },
  {
    id: 3,
    ingredient: '青椒',
    predictedAmount: 12.3,
    unit: 'kg',
    currentStock: 3.8,
    experienceAmount: 18.0,
    factors: ['价格上涨(-10%)', '促销活动(+5%)'],
    historicalData: [
      { day: '周一', amount: 10.5 },
      { day: '周二', amount: 12.8 },
      { day: '周三', amount: 11.2 },
      { day: '周四', amount: 13.1 },
      { day: '周五', amount: 15.8 },
      { day: '周六', amount: 14.2 },
      { day: '周日', amount: 12.8 }
    ]
  },
  {
    id: 4,
    ingredient: '胡萝卜',
    predictedAmount: 8.5,
    unit: 'kg',
    currentStock: 2.1,
    experienceAmount: 12.0,
    factors: ['季节性减少(-15%)'],
    historicalData: [
      { day: '周一', amount: 7.2 },
      { day: '周二', amount: 8.8 },
      { day: '周三', amount: 7.9 },
      { day: '周四', amount: 8.5 },
      { day: '周五', amount: 10.2 },
      { day: '周六', amount: 9.8 },
      { day: '周日', amount: 8.5 }
    ]
  },
  {
    id: 5,
    ingredient: '大米',
    predictedAmount: 45.2,
    unit: 'kg',
    currentStock: 15.8,
    experienceAmount: 55.0,
    factors: ['周末外卖增加(+12%)'],
    historicalData: [
      { day: '周一', amount: 38.5 },
      { day: '周二', amount: 42.0 },
      { day: '周三', amount: 40.8 },
      { day: '周四', amount: 43.5 },
      { day: '周五', amount: 48.2 },
      { day: '周六', amount: 52.1 },
      { day: '周日', amount: 46.8 }
    ]
  },
  {
    id: 6,
    ingredient: '西红柿',
    predictedAmount: 16.5,
    unit: 'kg',
    currentStock: 6.8,
    experienceAmount: 22.0,
    factors: ['季节盛产(-12%)', '价格下降(+8%)'],
    historicalData: [
      { day: '周一', amount: 14.2 },
      { day: '周二', amount: 16.8 },
      { day: '周三', amount: 15.5 },
      { day: '周四', amount: 17.2 },
      { day: '周五', amount: 19.5 },
      { day: '周六', amount: 18.8 },
      { day: '周日', amount: 16.5 }
    ]
  },
  {
    id: 7,
    ingredient: '洋葱',
    predictedAmount: 9.8,
    unit: 'kg',
    currentStock: 4.2,
    experienceAmount: 14.0,
    factors: ['库存充足(-8%)', '菜品调整(-5%)'],
    historicalData: [
      { day: '周一', amount: 8.5 },
      { day: '周二', amount: 10.2 },
      { day: '周三', amount: 9.1 },
      { day: '周四', amount: 10.8 },
      { day: '周五', amount: 12.5 },
      { day: '周六', amount: 11.8 },
      { day: '周日', amount: 9.8 }
    ]
  },
  {
    id: 8,
    ingredient: '猪肉',
    predictedAmount: 32.5,
    unit: 'kg',
    currentStock: 12.8,
    experienceAmount: 40.0,
    factors: ['价格上涨(-10%)', '需求稳定(+5%)'],
    historicalData: [
      { day: '周一', amount: 28.5 },
      { day: '周二', amount: 32.0 },
      { day: '周三', amount: 30.8 },
      { day: '周四', amount: 33.5 },
      { day: '周五', amount: 36.2 },
      { day: '周六', amount: 38.1 },
      { day: '周日', amount: 32.8 }
    ]
  },
  {
    id: 9,
    ingredient: '豆腐',
    predictedAmount: 14.2,
    unit: '块',
    currentStock: 8.5,
    experienceAmount: 18.0,
    factors: ['素食增加(+10%)', '成本控制(-8%)'],
    historicalData: [
      { day: '周一', amount: 12.5 },
      { day: '周二', amount: 14.8 },
      { day: '周三', amount: 13.5 },
      { day: '周四', amount: 15.2 },
      { day: '周五', amount: 16.5 },
      { day: '周六', amount: 15.8 },
      { day: '周日', amount: 14.2 }
    ]
  },
  {
    id: 10,
    ingredient: '���蛋',
    predictedAmount: 8.5,
    unit: '斤',
    currentStock: 3.2,
    experienceAmount: 12.0,
    factors: ['早餐减量(-15%)', '价格稳定(+3%)'],
    historicalData: [
      { day: '周一', amount: 7.2 },
      { day: '周二', amount: 8.8 },
      { day: '周三', amount: 7.9 },
      { day: '周四', amount: 9.5 },
      { day: '周五', amount: 10.2 },
      { day: '周六', amount: 9.8 },
      { day: '周日', amount: 8.5 }
    ]
  },
  {
    id: 11,
    ingredient: '白菜',
    predictedAmount: 22.8,
    unit: 'kg',
    currentStock: 9.5,
    experienceAmount: 28.0,
    factors: ['季节上市(-12%)', '储存优化(-8%)'],
    historicalData: [
      { day: '周一', amount: 20.5 },
      { day: '周二', amount: 23.8 },
      { day: '周三', amount: 21.5 },
      { day: '周四', amount: 24.2 },
      { day: '周五', amount: 26.5 },
      { day: '周六', amount: 25.8 },
      { day: '周日', amount: 22.8 }
    ]
  },
  {
    id: 12,
    ingredient: '面粉',
    predictedAmount: 38.5,
    unit: 'kg',
    currentStock: 18.2,
    experienceAmount: 45.0,
    factors: ['面食减少(-8%)', '库存管理(-6%)'],
    historicalData: [
      { day: '周一', amount: 35.2 },
      { day: '周二', amount: 39.8 },
      { day: '周三', amount: 37.5 },
      { day: '周四', amount: 40.2 },
      { day: '周五', amount: 42.5 },
      { day: '周六', amount: 41.8 },
      { day: '周日', amount: 38.5 }
    ]
  }
];

interface PredictionDetailProps {
  ingredient: {
    id: number;
    ingredient: string;
    predictedAmount: number;
    unit: string;
    currentStock: number;
    factors: string[];
    historicalData: { day: string; amount: number }[];
  };
}

const PredictionDetail: React.FC<PredictionDetailProps> = ({ ingredient }) => {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-4">过去7天消耗量趋势</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ingredient.historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}kg`, '消耗量']} />
              <Line type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div>
        <h4 className="mb-3">影响因素</h4>
        <div className="flex flex-wrap gap-2">
          {ingredient.factors.map((factor, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {factor.includes('+') ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : factor.includes('-') ? (
                <TrendingDown className="w-3 h-3 text-red-600" />
              ) : null}
              {factor}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PredictionDashboard: React.FC = () => {
  const [showComparison, setShowComparison] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const itemsPerPage = 5; // 每页显示5条数据
  const API_BASE = 'http://localhost:3002';

  // 后端数据状态（以 mock 作为回退）
  const [predictionRows, setPredictionRows] = useState<typeof mockPredictionData>(mockPredictionData as any);
  const defaultTraffic = [
    { time: '06:00', customers: 5, prediction: 5 },
    { time: '07:00', customers: 15, prediction: 18 },
    { time: '08:00', customers: 35, prediction: 42 },
    { time: '09:00', customers: 25, prediction: 28 },
    { time: '10:00', customers: 18, prediction: 22 },
    { time: '11:00', customers: 45, prediction: 52 },
    { time: '12:00', customers: 85, prediction: 95 },
    { time: '13:00', customers: 75, prediction: 88 },
    { time: '14:00', customers: 35, prediction: 38 },
    { time: '15:00', customers: 25, prediction: 28 },
    { time: '16:00', customers: 30, prediction: 35 },
    { time: '17:00', customers: 55, prediction: 68 },
    { time: '18:00', customers: 95, prediction: 108 },
    { time: '19:00', customers: 85, prediction: 95 },
    { time: '20:00', customers: 65, prediction: 72 },
    { time: '21:00', customers: 35, prediction: 38 },
    { time: '22:00', customers: 15, prediction: 18 }
  ];
  const [trafficData, setTrafficData] = useState(defaultTraffic);

  React.useEffect(() => {
    const controller = new AbortController();
    const targetDate = selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined;
    // 销售预测
    fetch(`${API_BASE}/predictions/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate, storeId: 'SH001' }),
      signal: controller.signal
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setPredictionRows(data);
        }
      })
      .catch(() => {})
      ;
    // 客流预测
    fetch(`${API_BASE}/predictions/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate, storeId: 'SH001' }),
      signal: controller.signal
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setTrafficData(data);
        }
      })
      .catch(() => {})
      ;
    return () => controller.abort();
  // 仅在日期变化时更新
  }, [selectedDate]);
  
  // 计算节省金额（按天 → 月度外推）
  const dailySavings = predictionRows.reduce((sum, item) => {
    const waste = item.experienceAmount - item.predictedAmount;
    return sum + (waste > 0 ? waste * 8 : 0); // 假设平均每kg节省8元
  }, 0);
  const totalSavings = Math.max(0, dailySavings * 30); // 以30天外推为“本月节省”

  // 分页计算
  const totalPages = Math.ceil(predictionRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = predictionRows.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleConfirmOrder = async () => {
    try {
      const targetDate = selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined;
      const res = await fetch(`${API_BASE}/orders/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate,
          storeId: 'SH001',
          items: predictionRows.map((x) => ({ ingredient: x.ingredient, amount: x.predictedAmount, unit: x.unit }))
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        toast.success('订货单已成功发送', { description: data.eta || '已提交' });
      } else {
        toast.error('订货提交失败');
      }
    } catch (e) {
      toast.error('订货提交失败');
    }
  };

  // 预测因素详细信息（默认值）
  const defaultFactorDetails = {
    date: {
      title: "日期因素详情",
      description: "周六是客流高峰期，预测影响 +15%",
      details: [
        { label: "历史客流数据", value: "周六平均客流比平日高 35%" },
        { label: "同期对比", value: "过去4个周六平均增长 15%" },
        { label: "影响菜品", value: "土豆丝、炒饭、盖浇饭等主食" },
        { label: "建议", value: "适当增加主食类食材储备" }
      ]
    },
    activity: {
      title: "周边活动详情", 
      description: "附近体育馆有大型比赛，预计影响 +12%",
      details: [
        { label: "活动类型", value: "市级篮球联赛决赛" },
        { label: "预计人流", value: "3000-5000人次" },
        { label: "影响时段", value: "11:30-14:00, 17:00-20:00" },
        { label: "历史经验", value: "类似活动平均带来12%客流增长" }
      ]
    },
    weather: {
      title: "天气状况详情",
      description: "晴朗天气利于外出就餐，预计影响 +8%", 
      details: [
        { label: "天气预报", value: "晴，25-28°C，微风" },
        { label: "历史数据", value: "晴天比阴雨天客流高8-12%" },
        { label: "影响菜品", value: "凉菜、饮品需求增加" },
        { label: "建议", value: "增加清爽类菜品和饮品储备" }
      ]
    }
  };

  const [factorDetails, setFactorDetails] = useState(defaultFactorDetails);
  React.useEffect(() => {
    const controller = new AbortController();
    const targetDate = selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined;
    fetch(`${API_BASE}/predictions/factors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDate }),
      signal: controller.signal
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (data?.date && data?.activity && data?.weather) setFactorDetails(data);
      })
      .catch(() => {})
    ;
    return () => controller.abort();
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* 核心价值展示 */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 mb-2">本月预估节省金额</p>
              <p className="text-4xl font-bold">¥{totalSavings.toFixed(0)}</p>
              <p className="text-blue-100 mt-2">相比传统经验订货</p>
            </div>
            <div className="text-right">
              <div className="bg-white/10 rounded-lg p-4">
                <TrendingDown className="w-8 h-8 mb-2" />
                <p className="text-sm">浪费减少</p>
                <p className="text-xl font-semibold">32%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预测因素概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">日期因素</p>
                  <p className="font-semibold">周六 (+15%)</p>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Info className="w-4 h-4 text-gray-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {factorDetails.date.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {factorDetails.date.description}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-3">
                    {/* 日历选择区域 */}
                    <div className="flex justify-center">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <h4 className="font-medium text-xs mb-1 text-center text-gray-700">
                          选择日期查看影响
                        </h4>
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          className="rounded-md border shadow-sm scale-75"
                          locale={zhCN}
                        />
                      </div>
                    </div>
                    
                    {/* 分析数据区域 */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-1 text-xs">
                        周六客流分析
                      </h4>
                      
                      {/* 关键信息卡片 */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-2 bg-blue-50 rounded border-l-2 border-blue-500">
                          <div className="text-xs font-medium text-blue-900 mb-1">客流增长</div>
                          <div className="text-sm font-bold text-blue-600">+35%</div>
                          <div className="text-xs text-blue-700">比平日高</div>
                        </div>
                        
                        <div className="p-2 bg-green-50 rounded border-l-2 border-green-500">
                          <div className="text-xs font-medium text-green-900 mb-1">建议储备</div>
                          <div className="text-xs text-green-700">主食类食材</div>
                          <div className="text-xs text-green-600">土豆丝、炒饭等</div>
                        </div>
                      </div>
                      
                      {/* 周客流趋势图表 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded">
                        <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          周客流趋势
                        </h5>
                        <div className="grid grid-cols-7 gap-0.5">
                          {['一', '二', '三', '四', '五', '六', '日'].map((day, i) => (
                            <div key={day} className="text-center">
                              <div className="text-xs text-gray-600 mb-0.5">{day}</div>
                              <div className={`h-6 rounded flex items-end justify-center transition-all duration-300 ${
                                day === '六' 
                                  ? 'bg-blue-600 text-white shadow-sm' 
                                  : 'bg-blue-200 hover:bg-blue-300 text-gray-700'
                              }`}>
                                <span className="text-xs pb-0.5 font-medium">
                                  {[65, 70, 68, 72, 85, 95, 78][i]}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">周边活动</p>
                  <p className="font-semibold">体育馆比赛 (+12%)</p>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Info className="w-4 h-4 text-gray-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-600" />
                      {factorDetails.activity.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {factorDetails.activity.description}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-3">
                    {/* 关键信息卡片 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-1.5 bg-green-50 rounded border-l-2 border-green-500">
                        <div className="text-xs font-medium text-green-900 mb-0.5">客流影响</div>
                        <div className="text-sm font-bold text-green-600">+12%</div>
                        <div className="text-xs text-green-700">预计增长</div>
                      </div>
                      
                      <div className="p-1.5 bg-blue-50 rounded border-l-2 border-blue-500">
                        <div className="text-xs font-medium text-blue-900 mb-0.5">活动距离</div>
                        <div className="text-sm font-bold text-blue-600">280米</div>
                        <div className="text-xs text-blue-700">体育馆比赛</div>
                      </div>
                    </div>
                    
                    {/* 地图组件 - 预留位置 */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-2 rounded">
                      <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                        <Navigation className="w-3 h-3 text-green-600" />
                        活动位置
                      </h5>
                      <div className="relative bg-white rounded p-2 h-28 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-xs">地图组件预留位置</div>
                          <div className="text-xs text-gray-400">待接入真实地图API</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 人流时段 */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-2 rounded">
                      <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3 text-green-600" />
                        人流高峰时段
                      </h5>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs text-gray-600">11:30-14:00</div>
                          <div className="text-xs font-medium text-green-600">高峰</div>
                        </div>
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs text-gray-600">17:00-20:00</div>
                          <div className="text-xs font-medium text-green-600">高峰</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 历史影响数据 */}
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-2 rounded">
                      <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3 text-green-600" />
                        历史影响
                      </h5>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs font-bold text-green-600">+12%</div>
                          <div className="text-xs text-gray-600">平均增长</div>
                        </div>
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs font-bold text-green-600">85%</div>
                          <div className="text-xs text-gray-600">预测准确率</div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CloudRain className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">天气状况</p>
                  <p className="font-semibold">晴天 (+8%)</p>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <Info className="w-4 h-4 text-gray-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2 text-sm">
                      <Sun className="w-4 h-4 text-orange-600" />
                      {factorDetails.weather.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {factorDetails.weather.description}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-3">
                    {/* 关键信息卡片 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-1.5 bg-orange-50 rounded border-l-2 border-orange-500">
                        <div className="text-xs font-medium text-orange-900 mb-0.5">天气影响</div>
                        <div className="text-sm font-bold text-orange-600">+8%</div>
                        <div className="text-xs text-orange-700">客流增长</div>
                      </div>
                      
                      <div className="p-1.5 bg-blue-50 rounded border-l-2 border-blue-500">
                        <div className="text-xs font-medium text-blue-900 mb-0.5">当前温度</div>
                        <div className="text-sm font-bold text-blue-600">26°C</div>
                        <div className="text-xs text-blue-700">晴朗</div>
                      </div>
                    </div>
                    
                    {/* 天气组件 - 预留位置 */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-2 rounded">
                      <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                        <Sun className="w-3 h-3 text-orange-600" />
                        实时天气
                      </h5>
                      <div className="relative bg-white rounded p-2 h-28 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Sun className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-xs">天气组件预留位置</div>
                          <div className="text-xs text-gray-400">待接入天气API</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 历史影响数据 */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-2 rounded">
                      <h5 className="font-medium text-gray-800 mb-1 flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3 text-orange-600" />
                        历史影响
                      </h5>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs font-bold text-orange-600">+8%</div>
                          <div className="text-xs text-gray-600">平均增长</div>
                        </div>
                        <div className="text-center p-1 bg-white rounded">
                          <div className="text-xs font-bold text-orange-600">92%</div>
                          <div className="text-xs text-gray-600">预测准确率</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 客流高峰预测 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            客流高峰预测 (明日 2025年9月23日)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 时段客流预测图表 */}
            <div>
              <h4 className="mb-4 font-medium">时段客流预测</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      `${value}人`, 
                      name === 'customers' ? '历史平均' : 'AI预测'
                    ]} />
                    <Area type="monotone" dataKey="customers" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="prediction" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 高峰时段分析 */}
            <div>
              <h4 className="mb-4 font-medium">高峰时段分析</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 早餐高峰 */}
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="w-5 h-5 text-blue-600" />
                    <div>
                      <h5 className="font-medium text-blue-900">早餐高峰</h5>
                      <p className="text-xs text-blue-600">7:00-9:00</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">预测客流</span>
                      <span className="font-bold text-blue-900">42人 <span className="text-green-600 text-sm">+20%</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">建议排班</span>
                      <span className="font-medium text-blue-900">3人</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-2">包子、豆浆、粥类</div>
                  </div>
                </div>

                {/* 午餐高峰 */}
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <h5 className="font-medium text-green-900">午餐高峰</h5>
                      <p className="text-xs text-green-600">11:30-13:30</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">预测客流</span>
                      <span className="font-bold text-green-900">95人 <span className="text-green-600 text-sm">+25%</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">建议排班</span>
                      <span className="font-medium text-green-900">5人</span>
                    </div>
                    <div className="text-xs text-green-600 mt-2">盖浇饭、面条、炒菜</div>
                  </div>
                </div>

                {/* 晚餐高峰 */}
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-orange-600" />
                    <div>
                      <h5 className="font-medium text-orange-900">晚餐高峰</h5>
                      <p className="text-xs text-orange-600">17:30-19:30</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">预测客流</span>
                      <span className="font-bold text-orange-900">108人 <span className="text-green-600 text-sm">+30%</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">建议排班</span>
                      <span className="font-medium text-orange-900">6人</span>
                    </div>
                    <div className="text-xs text-orange-600 mt-2">火锅、烧烤、炒菜</div>
                  </div>
                </div>

                {/* 预测准确率 */}
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                      <h5 className="font-medium text-purple-900">预测准确率</h5>
                      <p className="text-xs text-purple-600">模型性能</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">当前准确率</span>
                      <span className="font-bold text-purple-900">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">7天平均</span>
                      <span className="font-medium text-purple-900">89%</span>
                    </div>
                    <div className="text-xs text-purple-600 mt-2">持续学习中</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 明日预测清单 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              明日智能订货建议 (2025年9月23日)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showComparison ? "default" : "outline"}
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? "隐藏对比" : "对比经验订货"}
              </Button>
              <Button onClick={handleConfirmOrder} className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="w-4 h-4 mr-2" />
                确认订货
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>食材名称</TableHead>
                <TableHead>预测订货量</TableHead>
                <TableHead>当前库存</TableHead>
                {showComparison && <TableHead>经验订货量</TableHead>}
                {showComparison && <TableHead>差异</TableHead>}
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((item) => {
                const difference = item.experienceAmount - item.predictedAmount;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.ingredient}</TableCell>
                    <TableCell>{item.predictedAmount}{item.unit}</TableCell>
                    <TableCell>{item.currentStock}{item.unit}</TableCell>
                    {showComparison && (
                      <TableCell className="text-gray-600">
                        {item.experienceAmount}{item.unit}
                      </TableCell>
                    )}
                    {showComparison && (
                      <TableCell>
                        {difference > 0 ? (
                          <span className="text-red-600 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            +{difference.toFixed(1)}{item.unit}
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center gap-1">
                            <TrendingDown className="w-4 h-4" />
                            {difference.toFixed(1)}{item.unit}
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            查看详情
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{item.ingredient} - 预测详情</DialogTitle>
                            <DialogDescription>
                              查看{item.ingredient}的历史消耗趋势和影响预测的关键因素
                            </DialogDescription>
                          </DialogHeader>
                          <PredictionDetail ingredient={item} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {/* 分页信息��控件 */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              显示 {startIndex + 1}-{Math.min(endIndex, mockPredictionData.length)} 条，共 {mockPredictionData.length} 条食材订货建议
            </div>
            
            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* AI模型信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI预测模型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">预测模型</span>
              </div>
              <p className="text-lg font-bold text-blue-600">深度学习神经网络</p>
              <p className="text-sm text-blue-700">基于历史销售数据训练</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">预测准确率</span>
              </div>
              <p className="text-lg font-bold text-green-600">92.5%</p>
              <p className="text-sm text-green-700">7天平均准确率</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">模型状态</span>
              </div>
              <p className="text-lg font-bold text-purple-600">运行中</p>
              <p className="text-sm text-purple-700">自动持续优化</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
