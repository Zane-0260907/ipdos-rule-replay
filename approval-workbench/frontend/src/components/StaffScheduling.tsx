import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  UserCheck, 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Star, 
  BookOpen, 
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  BarChart3,
  Download
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { apiFetchBlob, apiFetchJson, ApiError } from '../utils/api';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';

type ScheduleStaffAssignment = {
  staffId: number;
  name: string;
  position: string;
  hourlyRate: number;
};

type ShiftPlan = {
  shiftId: string;
  time: string;
  type: string;
  assignedStaff: ScheduleStaffAssignment[];
  predictedDemand: number;
  coverage: number;
  cost: number;
};

type DaySchedule = {
  date: string;
  day: string;
  shifts: ShiftPlan[];
  totalCost: number;
  totalCoverage: number;
};

type OptimizedSchedule = {
  week: string;
  dailySchedules: DaySchedule[];
  summary: {
    totalCost: number;
    totalHours: number;
    averageCoverage: number;
    costSavings: number;
    efficiency: number;
    recommendations: string[];
  };
};

type ScheduleHistoryEntry = {
  id: number;
  timestamp: string;
  request: { week?: string } | null;
  result: OptimizedSchedule;
};

export const StaffScheduling: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [viewMode, setViewMode] = useState('schedule');
  const [schedulePage, setSchedulePage] = useState(1);
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ScheduleHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const interpretApiError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return '演示鉴权未通过，请在左侧设置中填写访问令牌后重试。';
      }
      return error.message;
    }
    return fallback;
  };
  const itemsPerPage = 3; // 每页显示3天的排班

  // 员工数据
  const staffData = [
    {
      id: 1,
      name: '张小明',
      position: '主厨',
      level: '高级',
      skills: ['川菜', '粤菜', '食材管理'],
      performance: 92,
      availability: '全时',
      hourlyRate: 45,
      status: 'active'
    },
    {
      id: 2,
      name: '李小红',
      position: '服务员',
      level: '中级',
      skills: ['客户服务', '收银', '清洁'],
      performance: 88,
      availability: '兼职',
      hourlyRate: 25,
      status: 'active'
    },
    {
      id: 3,
      name: '王小强',
      position: '配菜员',
      level: '初级',
      skills: ['配菜', '备料', '清洁'],
      performance: 85,
      availability: '全时',
      hourlyRate: 30,
      status: 'active'
    },
    {
      id: 4,
      name: '赵小美',
      position: '服务员',
      level: '高级',
      skills: ['客户服务', '收银', '培训'],
      performance: 95,
      availability: '全时',
      hourlyRate: 35,
      status: 'active'
    }
  ];

  // 排班数据
  const scheduleData = [
    {
      date: '2024-01-15',
      day: '一',
      shifts: [
        { time: '09:00-17:00', staff: ['张小明', '王小强'], type: '白班', predicted: 65 },
        { time: '17:00-22:00', staff: ['李小红', '赵小美'], type: '晚班', predicted: 85 }
      ]
    },
    {
      date: '2024-01-16',
      day: '二',
      shifts: [
        { time: '09:00-17:00', staff: ['张小明', '赵小美'], type: '白班', predicted: 70 },
        { time: '17:00-22:00', staff: ['李小红', '王小强'], type: '晚班', predicted: 78 }
      ]
    }
  ];

  // 绩效趋势数据
  const performanceData = [
    { month: '1月', efficiency: 85, satisfaction: 90, cost: 12000 },
    { month: '2月', efficiency: 88, satisfaction: 92, cost: 11500 },
    { month: '3月', efficiency: 90, satisfaction: 94, cost: 11200 },
    { month: '4月', efficiency: 92, satisfaction: 96, cost: 10800 },
    { month: '5月', efficiency: 89, satisfaction: 93, cost: 11000 },
    { month: '6月', efficiency: 94, satisfaction: 95, cost: 10500 }
  ];

  // 培训需求数据
  const trainingNeeds = [
    {
      staff: '王小强',
      skill: '食材管理',
      urgency: 'high',
      estimatedTime: '2周',
      cost: 800
    },
    {
      staff: '李小红',
      skill: '高级客户服务',
      urgency: 'medium',
      estimatedTime: '1周',
      cost: 500
    },
    {
      staff: '张小明',
      skill: '团队管理',
      urgency: 'low',
      estimatedTime: '3周',
      cost: 1200
    }
  ];

  const buildStaffPayload = () =>
    staffData.map((member) => ({
      ...member,
      maxHoursPerWeek: member.availability === '全时' ? 40 : 20,
      preferredShifts:
        member.position === '主厨' ? ['breakfast'] : ['breakfast', 'dinner'],
    }));

  const resolveShiftLabel = (type: string) => {
    if (type === 'breakfast') return '白班';
    if (type === 'lunch') return '午班';
    if (type === 'dinner') return '晚班';
    return type;
  };

  const handleOptimizeSchedule = async () => {
    setIsOptimizing(true);
    try {
      const staffPayload = buildStaffPayload();
      const result = await apiFetchJson<OptimizedSchedule>('/scheduling/optimize', {
        method: 'POST',
        body: JSON.stringify({
          week: selectedWeek,
          staffMembers: staffPayload,
          shifts: [
            {
              id: 'morning',
              time: '09:00-17:00',
              type: 'breakfast',
              duration: 8,
              requiredSkills: ['客户服务', '收银'],
              minStaff: 2,
              maxStaff: 4,
              predictedDemand: 70,
            },
            {
              id: 'evening',
              time: '17:00-22:00',
              type: 'dinner',
              duration: 5,
              requiredSkills: ['客户服务', '收银'],
              minStaff: 2,
              maxStaff: 3,
              predictedDemand: 85,
            },
          ],
          constraints: {
            maxOvertimeHours: 10,
            minRestHours: 12,
            maxConsecutiveDays: 5,
          },
        }),
      });

      setOptimizedSchedule(result);
      const savings = result?.summary?.costSavings ?? 0;
      toast.success(`AI排班优化完成！预计可节省人力成本${savings.toFixed(1)}%`);
    } catch (error) {
      toast.error(interpretApiError(error, '排班优化失败，请稍后重试。'));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!optimizedSchedule) {
      toast.error('请先运行一次 AI 排班优化。');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await apiFetchBlob('/scheduling/download-report', {
        method: 'POST',
        body: JSON.stringify({
          optimizedSchedule,
          staffMembers: buildStaffPayload(),
        }),
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `智能排班报告_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('智能排班报告下载成功！');
    } catch (error) {
      toast.error(interpretApiError(error, '报告下载失败，请稍后再试。'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleApproveTraining = (staff: string) => {
    toast.success(`已批准${staff}的培训计划`);
  };

  const handleOpenHistory = async () => {
    if (isHistoryLoading) {
      return;
    }
    setIsHistoryLoading(true);
    try {
      const data = await apiFetchJson<{ history: ScheduleHistoryEntry[] }>('/scheduling/history', {
        method: 'POST',
        body: JSON.stringify({ limit: 20 }),
      });
      const entries = data.history ?? [];
      setHistoryItems(entries);
      setHistoryOpen(true);
      if (entries.length === 0) {
        toast.info('暂无排班历史记录，优化后再来看看。');
      }
    } catch (error) {
      toast.error(interpretApiError(error, '获取排班历史失败，请稍后重试。'));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 排班分页计算
  const fallbackDailySchedules = Array.isArray(scheduleData) ? scheduleData : [];
  const optimizedDailySchedules = Array.isArray(optimizedSchedule?.dailySchedules)
    ? optimizedSchedule?.dailySchedules ?? []
    : [];
  const currentScheduleData =
    optimizedDailySchedules.length > 0 ? optimizedDailySchedules : fallbackDailySchedules;
  const scheduleTotalPages = Math.max(1, Math.ceil(currentScheduleData.length / itemsPerPage || 1));
  const scheduleStartIndex = (schedulePage - 1) * itemsPerPage;
  const scheduleEndIndex = scheduleStartIndex + itemsPerPage;
  const scheduleCurrentData = currentScheduleData.slice(scheduleStartIndex, scheduleEndIndex);

  const summary = optimizedSchedule?.summary ?? null;
  const formatMetric = (value: unknown, digits = 1, fallback = '--') =>
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : fallback;
  const safeRecommendations = Array.isArray(summary?.recommendations)
    ? summary?.recommendations ?? []
    : [];

  const handleSchedulePageChange = (page: number) => {
    setSchedulePage(page);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能排班与人力优化</h1>
          <p className="text-gray-600 mt-2">AI驱动的员工管理和绩效优化系统</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">本周</SelectItem>
              <SelectItem value="next">下周</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button 
              onClick={handleOptimizeSchedule} 
              disabled={isOptimizing}
              className="flex items-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  优化中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  AI优化排班
                </>
              )}
            </Button>
          <Button
            variant="ghost"
            onClick={handleOpenHistory}
            disabled={isHistoryLoading}
            className="flex items-center gap-2"
          >
            {isHistoryLoading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                同步中…
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                历史记录
              </>
            )}
          </Button>
            
            {optimizedSchedule && (
              <Button 
                onClick={handleDownloadReport} 
                disabled={isDownloading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Download className="w-4 h-4 animate-pulse" />
                    下载中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    下载报告
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 核心指标概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">员工效率</p>
                <p className="text-2xl font-bold text-green-600">94%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +3.2% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">人力成本</p>
                <p className="text-2xl font-bold text-blue-600">¥10,500</p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  -8.5% vs 预算
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">客户满意度</p>
                <p className="text-2xl font-bold text-purple-600">95%</p>
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +2.1% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">在职员工</p>
                <p className="text-2xl font-bold text-orange-600">8人</p>
                <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                  <UserPlus className="w-3 h-3" />
                  招聘中: 2人
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* 主要功能区域 */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">智能排班</TabsTrigger>
          <TabsTrigger value="performance">绩效评估</TabsTrigger>
          <TabsTrigger value="training">培训管理</TabsTrigger>
          <TabsTrigger value="cost">成本分析</TabsTrigger>
        </TabsList>

        {/* 智能排班 */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 排班表 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  本周排班安排
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduleCurrentData.map((day: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{day.day}</span>
                          </div>
                          <span className="font-medium">{day.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {optimizedSchedule && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              已优化
                            </Badge>
                          )}
                          <Badge variant="outline">正常</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {day.shifts.map((shift: any, shiftIndex: number) => {
                          const typeLabel = resolveShiftLabel(shift.type);
                          return (
                            <div key={shiftIndex} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium">{shift.time}</span>
                                </div>
                                <Badge variant={typeLabel === '白班' ? 'secondary' : 'default'}>
                                  {typeLabel}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {(shift.assignedStaff || shift.staff).map((staff: any, staffIndex: number) => (
                                  <div key={staffIndex} className="text-sm text-gray-700 flex items-center justify-between">
                                    <span>{staff.name || staff}</span>
                                    {optimizedSchedule && staff.hourlyRate && (
                                      <span className="text-xs text-gray-500">¥{staff.hourlyRate}/时</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>预测客流: {shift.predictedDemand || shift.predicted}%</span>
                                {optimizedSchedule && (
                                  <span>覆盖率: {shift.coverage?.toFixed(1)}%</span>
                                )}
                              </div>
                              {optimizedSchedule && (
                                <div className="mt-1 text-xs text-green-600">
                                  成本: ¥{shift.cost?.toFixed(0)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {optimizedSchedule && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                          当日总成本: ¥{day.totalCost?.toFixed(0)} | 平均覆盖率: {day.totalCoverage?.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* 排班分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {scheduleStartIndex + 1}-{Math.min(scheduleEndIndex, currentScheduleData.length)} 天，共 {currentScheduleData.length} 天排班
                  </div>
                  
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleSchedulePageChange(Math.max(1, schedulePage - 1))}
                          className={schedulePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: scheduleTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleSchedulePageChange(page)}
                            isActive={schedulePage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleSchedulePageChange(Math.min(scheduleTotalPages, schedulePage + 1))}
                          className={schedulePage === scheduleTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </CardContent>
            </Card>

            {/* 员工状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  {optimizedSchedule ? '优化结果' : '员工状态'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {optimizedSchedule ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-900 mb-2">优化总结</div>
                      <div className="space-y-2 text-sm text-green-700">
                        <div>总成本: ¥{formatMetric(summary?.totalCost, 0, '0')}</div>
                        <div>总工时: {summary?.totalHours ?? '--'}小时</div>
                        <div>平均覆盖率: {formatMetric(summary?.averageCoverage, 1, '0.0')}%</div>
                        <div className="font-medium text-green-800">
                          成本节省: {formatMetric(summary?.costSavings, 1, '0.0')}%
                        </div>
                        <div>效率评分: {formatMetric(summary?.efficiency, 1, '0.0')}</div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-2">AI建议</div>
                      <div className="space-y-1 text-sm text-blue-700">
                        {safeRecommendations.map((rec: string, index: number) => (
                          <div key={index}>• {rec}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staffData.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{staff.name}</div>
                          <div className="text-xs text-gray-600">{staff.position}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs">{staff.performance}%</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={staff.availability === '全时' ? 'default' : 'secondary'}>
                            {staff.availability}
                          </Badge>
                          <div className="text-xs text-gray-600 mt-1">
                            ¥{staff.hourlyRate}/时
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 绩效评估 */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 绩效趋势图 */}
            <Card>
              <CardHeader>
                <CardTitle>绩效趋势分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="工作效率"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="satisfaction" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="客户满意度"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 员工绩效详情 */}
            <Card>
              <CardHeader>
                <CardTitle>员工绩效排名</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staffData
                    .sort((a, b) => b.performance - a.performance)
                    .map((staff, index) => (
                    <div key={staff.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-gray-600">{staff.position}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">{staff.performance}%</div>
                        <Progress value={staff.performance} className="w-20 h-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 培训管理 */}
        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 培训需求 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  AI识别培训需求
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingNeeds.map((need, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{need.staff}</div>
                          <div className="text-sm text-gray-600">{need.skill}</div>
                        </div>
                        <Badge variant={
                          need.urgency === 'high' ? 'destructive' :
                          need.urgency === 'medium' ? 'default' : 'secondary'
                        }>
                          {need.urgency === 'high' ? '高优先级' :
                           need.urgency === 'medium' ? '中优先级' : '低优先级'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {need.estimatedTime}
                        </div>
                        <div>
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          ¥{need.cost}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleApproveTraining(need.staff)}
                      >
                        批准培训计划
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 培训进度 */}
            <Card>
              <CardHeader>
                <CardTitle>当前培训进度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">李小红 - 高级客户服务</div>
                        <div className="text-sm text-gray-600">进行中</div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <Progress value={75} className="mb-2" />
                    <div className="text-sm text-gray-600">75% 完成，预计2天结束</div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">张小明 - 团队管理</div>
                        <div className="text-sm text-gray-600">计划中</div>
                      </div>
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <Progress value={0} className="mb-2" />
                    <div className="text-sm text-gray-600">等待开始，预计下周启动</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 成本分析 */}
        <TabsContent value="cost" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 人力成本趋势 */}
            <Card>
              <CardHeader>
                <CardTitle>人力成本趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cost" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 成本分析详情 */}
            <Card>
              <CardHeader>
                <CardTitle>成本结构分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">基础工资</div>
                      <div className="text-sm text-gray-600">全职员工薪资</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">¥8,200</div>
                      <div className="text-sm text-gray-600">78%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium">绩效奖金</div>
                      <div className="text-sm text-gray-600">基于表现的奖励</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">¥1,500</div>
                      <div className="text-sm text-gray-600">14%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-medium">培训费用</div>
                      <div className="text-sm text-gray-600">技能提升投入</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">¥800</div>
                      <div className="text-sm text-gray-600">8%</div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      AI优化建议
                    </h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• 调整晚班排班可节省15%成本</li>
                      <li>• 提升员工技能可减少培训费用</li>
                      <li>• 基于预测优化人员配置</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>排班优化历史</DialogTitle>
            <DialogDescription>最近的AI排班优化记录</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {historyItems.length === 0 && (
              <div className="text-sm text-gray-500">暂无历史记录</div>
            )}
            {historyItems.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <div className="font-medium">{new Date(item.timestamp).toLocaleString()}</div>
                  <Badge variant="secondary">{item.request?.week || '周'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>总成本：¥{item.result?.summary?.totalCost?.toFixed?.(0)}</div>
                  <div>节省：{item.result?.summary?.costSavings?.toFixed?.(1)}%</div>
                  <div>平均覆盖率：{item.result?.summary?.averageCoverage?.toFixed?.(1)}%</div>
                  <div>总工时：{item.result?.summary?.totalHours}</div>
                </div>
                <div className="mt-2 text-right">
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const blob = await apiFetchBlob('/scheduling/download-report-by-id', {
                        method: 'POST',
                        body: JSON.stringify({ id: item.id }),
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Staff_Schedule_Report_${new Date(item.timestamp).toISOString().split('T')[0]}_ID${item.id}.docx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast.success('历史报告已下载');
                    } catch (error) {
                      toast.error(interpretApiError(error, '下载失败，请稍后重试。'));
                    }
                  }}>下载报告</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
