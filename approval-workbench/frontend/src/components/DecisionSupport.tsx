import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { 
  Database, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap, 
  Brain,
  Eye,
  Settings,
  Calendar,
  DollarSign,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area } from 'recharts';
import { toast } from 'sonner';
import { apiFetchBlob, apiFetchJson, ApiError, isUnauthorizedError } from '../utils/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type SimulationRisk = 'low' | 'medium' | 'high';

type SimulationDetail = {
  label: string;
  value: string;
};

type SimulationScenario = {
  scenario: string;
  revenue: number;
  cost: number;
  profit: number;
  customerCount: number;
  risk: SimulationRisk;
  confidence: number;
  details: SimulationDetail[];
};

type SimulationRecommendation = {
  bestScenario: string;
  reasoning: string[];
  riskAssessment: string;
};

type SimulationMetrics = {
  baselineRevenue: number;
  baselineCost: number;
  baselineProfit: number;
  expectedUplift: number;
  marginImpact: number;
  paybackPeriod: number;
};

type DecisionSimulationResult = {
  scenarios: SimulationScenario[];
  recommendation: SimulationRecommendation;
  metrics: SimulationMetrics;
};

type DecisionSimulationRequest = {
  priceAdjustment: number;
  marketingBudget: number;
  staffCount: number;
  timeHorizon: number;
};

type DecisionHistoryEntry = {
  id: number;
  timestamp: string;
  input: DecisionSimulationRequest;
  result: DecisionSimulationResult;
};

type DecisionReportPayload = {
  inputParams?: DecisionSimulationRequest;
  scenarios?: SimulationScenario[];
  recommendation?: SimulationRecommendation;
  metrics?: SimulationMetrics;
};

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
});

const formatCurrency = (value: number) =>
  `¥${currencyFormatter.format(Math.round(value))}`;

export const DecisionSupport: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [simulationParams, setSimulationParams] = useState({
    priceAdjustment: [0],
    marketingBudget: [5000],
    staffCount: [8]
  });
  const [anomalyPage, setAnomalyPage] = useState(1);
  const [analysisPage, setAnalysisPage] = useState(1);
  const [simulationPage, setSimulationPage] = useState(1);
  const [simulationResults, setSimulationResults] = useState<DecisionSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<DecisionHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const itemsPerPage = 3; // 每页显示3条异常记录
  const analysisItemsPerPage = 3; // 每页显示3条指标记录
  const simulationItemsPerPage = 2; // 每页显示2个模拟方案

  const resolveDecisionError = (error: unknown, fallback: string) => {
    if (isUnauthorizedError(error)) {
      return '演示鉴权未通过，请在设置中补齐访问令牌后再试。';
    }
    if (error instanceof ApiError) {
      return error.message;
    }
    return fallback;
  };

  // 经营指标数据
  const operationalData = [
    { 
      metric: '营业收入', 
      current: 125000, 
      target: 150000, 
      trend: '+8.5%', 
      status: 'good',
      forecast: 142000
    },
    { 
      metric: '毛利率', 
      current: 68, 
      target: 70, 
      trend: '+2.1%', 
      status: 'warning',
      forecast: 69.5
    },
    { 
      metric: '客流量', 
      current: 2340, 
      target: 2800, 
      trend: '+12.3%', 
      status: 'good',
      forecast: 2650
    },
    { 
      metric: '人力成本率', 
      current: 32, 
      target: 30, 
      trend: '-1.8%', 
      status: 'warning',
      forecast: 31.2
    },
    { 
      metric: '食材损耗率', 
      current: 5.8, 
      target: 5.0, 
      trend: '-0.5%', 
      status: 'good',
      forecast: 5.2
    }
  ];

  // 异常检测数据
  const anomalyData = [
    {
      id: 1,
      type: '销售异常',
      description: '周三晚餐时段销售额异常下降',
      severity: 'high',
      impact: '预计影响日收入15%',
      suggestion: '建议检查菜品供应和服务质量',
      timestamp: '2024-01-14 19:30',
      status: 'active'
    },
    {
      id: 2,
      type: '成本异常',
      description: '本周食材成本超出预算12%',
      severity: 'medium',
      impact: '影响本周毛利率3个百分点',
      suggestion: '建议调整采购策略或菜品定价',
      timestamp: '2024-01-14 09:15',
      status: 'resolved'
    },
    {
      id: 3,
      type: '客流异常',
      description: '午餐时段客流量低于预期',
      severity: 'medium',
      impact: '午餐收入减少8%',
      suggestion: '考虑推出午餐特惠活动',
      timestamp: '2024-01-14 13:00',
      status: 'monitoring'
    }
  ];

  // 决策模拟数据
  const simulationScenarios = [
    {
      scenario: '提价5%',
      revenue: 131250,
      cost: 78750,
      profit: 52500,
      customerCount: 2223,
      risk: 'medium'
    },
    {
      scenario: '增加营销预算',
      revenue: 135000,
      cost: 85000,
      profit: 50000,
      customerCount: 2550,
      risk: 'low'
    },
    {
      scenario: '减少人员配置',
      revenue: 125000,
      cost: 75000,
      profit: 50000,
      customerCount: 2340,
      risk: 'high'
    }
  ];

  // 趋势预测数据
  const forecastData = [
    { date: '1/10', actual: 4200, predicted: 4180, confidence: 95 },
    { date: '1/11', actual: 4350, predicted: 4320, confidence: 94 },
    { date: '1/12', actual: 3980, predicted: 4100, confidence: 92 },
    { date: '1/13', actual: 4500, predicted: 4480, confidence: 96 },
    { date: '1/14', actual: 4250, predicted: 4300, confidence: 93 },
    { date: '1/15', actual: null, predicted: 4400, confidence: 89 },
    { date: '1/16', actual: null, predicted: 4350, confidence: 87 },
    { date: '1/17', actual: null, predicted: 4600, confidence: 85 }
  ];

  // 雷达图数据
  const radarData = [
    { subject: '营收', current: 85, target: 90 },
    { subject: '成本控制', current: 78, target: 85 },
    { subject: '客户满意度', current: 92, target: 95 },
    { subject: '员工效率', current: 88, target: 90 },
    { subject: '食材质量', current: 90, target: 95 },
    { subject: '运营效率', current: 82, target: 88 }
  ];

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const payload: DecisionSimulationRequest = {
        priceAdjustment: simulationParams.priceAdjustment[0],
        marketingBudget: simulationParams.marketingBudget[0],
        staffCount: simulationParams.staffCount[0],
        timeHorizon: 30,
      };
      const results = await apiFetchJson<DecisionSimulationResult>(
        '/decisions/simulate',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      setSimulationResults(results);
      toast.success(`决策模拟完成！推荐方案：${results.recommendation.bestScenario}`);
    } catch (error) {
      toast.error(resolveDecisionError(error, '模拟失败，请稍后再试。'));
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDownloadSimulationReport = async () => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);
    try {
      const payload: DecisionReportPayload = {
        inputParams: {
          priceAdjustment: simulationParams.priceAdjustment[0],
          marketingBudget: simulationParams.marketingBudget[0],
          staffCount: simulationParams.staffCount[0],
          timeHorizon: 30,
        },
      };
      if (simulationResults) {
        payload.scenarios = simulationResults.scenarios;
        payload.recommendation = simulationResults.recommendation;
        payload.metrics = simulationResults.metrics;
      }

      const blob = await apiFetchBlob('/decisions/download-report', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Decision_Simulation_Report_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('决策模拟报告下载成功！');
    } catch (error) {
      toast.error(resolveDecisionError(error, '决策报告下载失败，请稍后再试。'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleResolveAnomaly = (id: number) => {
    toast.success('异常已标记为已解决');
  };

  const handleAnomalyPageChange = (page: number) => {
    setAnomalyPage(page);
  };

  const handleAnalysisPageChange = (page: number) => {
    setAnalysisPage(page);
  };

  const handleSimulationPageChange = (page: number) => {
    setSimulationPage(page);
  };

  const handleOpenHistory = async () => {
    if (isHistoryLoading) {
      return;
    }
    setIsHistoryLoading(true);
    try {
      const data = await apiFetchJson<{ history: DecisionHistoryEntry[] }>(
        '/decisions/history',
        {
          method: 'POST',
          body: JSON.stringify({ limit: 20 }),
        },
      );
      const entries = data.history ?? [];
      setHistoryItems(entries);
      setHistoryOpen(true);
      if (entries.length === 0) {
        toast.info('暂无决策模拟历史，先运行一次模拟试试。');
      }
    } catch (error) {
      toast.error(resolveDecisionError(error, '获取历史失败，请稍后再试。'));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 异常检测分页计算
  const anomalyTotalPages = Math.ceil(anomalyData.length / itemsPerPage);
  const anomalyStartIndex = (anomalyPage - 1) * itemsPerPage;
  const anomalyEndIndex = anomalyStartIndex + itemsPerPage;
  const anomalyCurrentData = anomalyData.slice(anomalyStartIndex, anomalyEndIndex);

  // 指标分析分页计算
  const analysisTotalPages = Math.ceil(operationalData.length / analysisItemsPerPage);
  const analysisStartIndex = (analysisPage - 1) * analysisItemsPerPage;
  const analysisEndIndex = analysisStartIndex + analysisItemsPerPage;
  const analysisCurrentData = operationalData.slice(analysisStartIndex, analysisEndIndex);

  // 模拟结果分页计算
  const currentSimulationData = simulationResults ? simulationResults.scenarios : simulationScenarios;
  const simulationTotalPages = Math.ceil(currentSimulationData.length / simulationItemsPerPage);
  const simulationStartIndex = (simulationPage - 1) * simulationItemsPerPage;
  const simulationEndIndex = simulationStartIndex + simulationItemsPerPage;
  const simulationCurrentData = currentSimulationData.slice(simulationStartIndex, simulationEndIndex);

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">多维度数据分析与决策支持</h1>
          <p className="text-gray-600 mt-2">AI驱动的业务洞察和智能决策建议系统</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">营业收入</SelectItem>
              <SelectItem value="profit">利润分析</SelectItem>
              <SelectItem value="customer">客户指标</SelectItem>
              <SelectItem value="operation">运营效率</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="flex items-center gap-2"
            onClick={handleDownloadSimulationReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                生成中…
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                生成报告
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
                同步历史…
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                历史记录
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 核心指标概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">预测准确率</p>
                <p className="text-2xl font-bold text-green-600">92.5%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +2.3% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">异常检测</p>
                <p className="text-2xl font-bold text-orange-600">3项</p>
                <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  需要关注
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">决策建议</p>
                <p className="text-2xl font-bold text-blue-600">5条</p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <Zap className="w-3 h-3" />
                  待执行
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ROI提升</p>
                <p className="text-2xl font-bold text-purple-600">+18.5%</p>
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  基于AI建议
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* 主要功能区域 */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">可视化报表</TabsTrigger>
          <TabsTrigger value="anomaly">异常检测</TabsTrigger>
          <TabsTrigger value="analysis">指标分析</TabsTrigger>
          <TabsTrigger value="simulation">决策模拟</TabsTrigger>
        </TabsList>

        {/* 可视化报表 */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 预测vs实际 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  预测准确性分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="actual" fill="#3b82f6" name="实际值" />
                      <Line 
                        type="monotone" 
                        dataKey="predicted" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="预测值"
                        strokeDasharray="5 5"
                      />
                      <Area 
                        dataKey="confidence" 
                        fill="#f3f4f6" 
                        fillOpacity={0.3}
                        name="置信度"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">92.5%</div>
                    <div className="text-gray-600">平均准确率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">±5.2%</div>
                    <div className="text-gray-600">预测误差</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">89%</div>
                    <div className="text-gray-600">置信度</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 综合雷达图 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  经营指标雷达图
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="当前"
                        dataKey="current"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="目标"
                        dataKey="target"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.1}
                        strokeDasharray="5 5"
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span>当前表现</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>目标水平</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 异常检测 */}
        <TabsContent value="anomaly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                实时异常监控
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalyCurrentData.map((anomaly) => (
                  <div key={anomaly.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          anomaly.severity === 'high' ? 'bg-red-500' :
                          anomaly.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{anomaly.type}</div>
                          <div className="text-sm text-gray-600">{anomaly.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          anomaly.status === 'active' ? 'destructive' :
                          anomaly.status === 'resolved' ? 'default' : 'secondary'
                        }>
                          {anomaly.status === 'active' ? '活跃' :
                           anomaly.status === 'resolved' ? '已解决' : '监控中'}
                        </Badge>
                        <Badge variant="outline">
                          {anomaly.severity === 'high' ? '高' :
                           anomaly.severity === 'medium' ? '中' : '低'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">影响评估</div>
                        <div className="font-medium text-red-600">{anomaly.impact}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">检测时间</div>
                        <div className="font-medium">{anomaly.timestamp}</div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <div className="text-sm font-medium text-blue-900 mb-1">AI建议</div>
                      <div className="text-sm text-blue-700">{anomaly.suggestion}</div>
                    </div>
                    
                    {anomaly.status === 'active' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleResolveAnomaly(anomaly.id)}
                        >
                          标记已解决
                        </Button>
                        <Button size="sm" variant="outline">
                          查看详情
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 异常检测分页信息和控件 */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  显示 {anomalyStartIndex + 1}-{Math.min(anomalyEndIndex, anomalyData.length)} 条，共 {anomalyData.length} 条异常记录
                </div>
                
                <Pagination className="justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handleAnomalyPageChange(Math.max(1, anomalyPage - 1))}
                        className={anomalyPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: anomalyTotalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handleAnomalyPageChange(page)}
                          isActive={anomalyPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handleAnomalyPageChange(Math.min(anomalyTotalPages, anomalyPage + 1))}
                        className={anomalyPage === anomalyTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 指标分析 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                关键经营指标分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>指标</TableHead>
                    <TableHead>当前值</TableHead>
                    <TableHead>目标值</TableHead>
                    <TableHead>趋势</TableHead>
                    <TableHead>预测值</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisCurrentData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.metric}</TableCell>
                      <TableCell>
                        {item.metric.includes('率') ? `${item.current}%` : 
                         item.metric.includes('收入') ? `¥${item.current.toLocaleString()}` :
                         item.current.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {item.metric.includes('率') ? `${item.target}%` : 
                         item.metric.includes('收入') ? `¥${item.target.toLocaleString()}` :
                         item.target.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${
                          item.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.trend.startsWith('+') ? 
                            <TrendingUp className="w-3 h-3" /> : 
                            <TrendingUp className="w-3 h-3 rotate-180" />
                          }
                          {item.trend}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.metric.includes('率') ? `${item.forecast}%` : 
                         item.metric.includes('收入') ? `¥${item.forecast.toLocaleString()}` :
                         item.forecast.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'good' ? 'default' : 'secondary'}>
                          {item.status === 'good' ? '良好' : '关注'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* 指标分析分页信息和控件 */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  显示 {analysisStartIndex + 1}-{Math.min(analysisEndIndex, operationalData.length)} 条，共 {operationalData.length} 条指标记录
                </div>
                
                <Pagination className="justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handleAnalysisPageChange(Math.max(1, analysisPage - 1))}
                        className={analysisPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: analysisTotalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handleAnalysisPageChange(page)}
                          isActive={analysisPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handleAnalysisPageChange(Math.min(analysisTotalPages, analysisPage + 1))}
                        className={analysisPage === analysisTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 决策模拟 */}
        <TabsContent value="simulation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* 模拟参数设置 */}
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  决策模拟参数
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-medium mb-2">价格调整</label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={simulationParams.priceAdjustment}
                      onValueChange={(value) => setSimulationParams(prev => ({ ...prev, priceAdjustment: value }))}
                      max={20}
                      min={-20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-16">{simulationParams.priceAdjustment[0]}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">调整菜品价格，影响客流量和收入</div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">营销预算</label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={simulationParams.marketingBudget}
                      onValueChange={(value) => setSimulationParams(prev => ({ ...prev, marketingBudget: value }))}
                      max={20000}
                      min={0}
                      step={1000}
                      className="flex-1"
                    />
                    <span className="text-sm w-16">¥{simulationParams.marketingBudget[0]}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">增加营销投入，提升品牌知名度和客流量</div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">员工数量</label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={simulationParams.staffCount}
                      onValueChange={(value) => setSimulationParams(prev => ({ ...prev, staffCount: value }))}
                      max={15}
                      min={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-16">{simulationParams.staffCount[0]}人</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">调整人员配置，影响服务质量和人力成本</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">模拟说明</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>• 基于历史数据和AI模型预测</div>
                    <div>• 考虑市场变化和竞争环境</div>
                    <div>• 提供风险评估和优化建议</div>
                  </div>
                </div>

                <Button 
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="w-full flex items-center gap-2"
                >
                  {isSimulating ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      模拟中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      运行模拟
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

                 {/* 模拟结果 */}
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  模拟结果对比
                </CardTitle>
                     {simulationResults && (
                       <div className="mt-2">
                         <Button
                           variant="outline"
                           onClick={handleDownloadSimulationReport}
                           disabled={isExporting}
                           className="flex items-center gap-2"
                         >
                           {isExporting ? (
                             <>
                               <RotateCcw className="w-4 h-4 animate-spin" />
                               下载中…
                             </>
                           ) : (
                             <>
                               <Download className="w-4 h-4" />
                               下载报告
                             </>
                           )}
                         </Button>
                       </div>
                     )}
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-4">
                  {simulationCurrentData.map((scenario: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">{scenario.scenario}</div>
                        <Badge variant={
                          scenario.risk === 'low' ? 'default' :
                          scenario.risk === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {scenario.risk === 'low' ? '低风险' :
                           scenario.risk === 'medium' ? '中风险' : '高风险'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">收入</div>
                          <div className="font-bold text-green-600">¥{scenario.revenue.toLocaleString()}</div>
                          {simulationResults && scenario.details && (
                            <div className="text-xs text-gray-500">
                              {scenario.details.revenueChange > 0 ? '+' : ''}{scenario.details.revenueChange}%
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-gray-600">成本</div>
                          <div className="font-bold text-red-600">¥{scenario.cost.toLocaleString()}</div>
                          {simulationResults && scenario.details && (
                            <div className="text-xs text-gray-500">
                              {scenario.details.costChange > 0 ? '+' : ''}{scenario.details.costChange}%
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-gray-600">利润</div>
                          <div className="font-bold text-blue-600">¥{scenario.profit.toLocaleString()}</div>
                          {simulationResults && scenario.details && (
                            <div className="text-xs text-gray-500">
                              {scenario.details.profitChange > 0 ? '+' : ''}{scenario.details.profitChange}%
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-gray-600">客户数</div>
                          <div className="font-bold">{scenario.customerCount}人</div>
                          {simulationResults && scenario.details && (
                            <div className="text-xs text-gray-500">
                              {scenario.details.customerChange > 0 ? '+' : ''}{scenario.details.customerChange}%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {simulationResults && (
                        <div className="mt-3 text-xs text-gray-500">
                          置信度: {scenario.confidence}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* 模拟结果分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {simulationStartIndex + 1}-{Math.min(simulationEndIndex, currentSimulationData.length)} 个，共 {currentSimulationData.length} 个方案
                  </div>
                  
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleSimulationPageChange(Math.max(1, simulationPage - 1))}
                          className={simulationPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: simulationTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleSimulationPageChange(page)}
                            isActive={simulationPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleSimulationPageChange(Math.min(simulationTotalPages, simulationPage + 1))}
                          className={simulationPage === simulationTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>

                {simulationResults && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      AI决策建议
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div className="font-medium">推荐方案：{simulationResults.recommendation.bestScenario}</div>
                      {simulationResults.recommendation.reasoning.map((reason: string, index: number) => (
                        <div key={index}>• {reason}</div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-blue-600">
                      {simulationResults.recommendation.riskAssessment}
                    </div>
                  </div>
                )}

                {!simulationResults && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      AI决策建议
                    </h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>• 推荐增加营销预算方案，风险低收益稳定</div>
                      <div>• 避免大幅提价，可能影响客户忠诚度</div>
                      <div>• 人员减配风险较高，需谨慎考虑</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>决策模拟历史</DialogTitle>
            <DialogDescription>最近运行的AI决策模拟记录</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {historyItems.length === 0 && (
              <div className="text-sm text-gray-500">暂无历史记录</div>
            )}
            {historyItems.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <div className="font-medium">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="text-gray-600">
                    价格{item.input?.priceAdjustment}% / 营销¥{item.input?.marketingBudget} / 人员{item.input?.staffCount}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>基线收入：{item.result ? formatCurrency(item.result.metrics.baselineRevenue) : '—'}</div>
                  <div>预期提升：{item.result ? formatCurrency(item.result.metrics.expectedUplift) : '—'}</div>
                  <div>回收周期：{item.result ? item.result.metrics.paybackPeriod : '--'} 天</div>
                </div>
                <div className="mt-1 text-sm text-blue-700">推荐：{item.result?.recommendation?.bestScenario}</div>
                <div className="mt-2 text-right">
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const blob = await apiFetchBlob('/decisions/download-report-by-id', {
                    method: 'POST',
                    body: JSON.stringify({ id: item.id }),
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Decision_Simulation_Report_${new Date(item.timestamp).toISOString().split('T')[0]}_ID${item.id}.docx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  toast.success('历史决策报告下载成功');
                } catch (error) {
                  toast.error(resolveDecisionError(error, '下载失败，请稍后再试。'));
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
