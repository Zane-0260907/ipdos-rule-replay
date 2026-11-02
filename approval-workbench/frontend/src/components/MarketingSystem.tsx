import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { 
  Heart, 
  Users, 
  MessageCircle, 
  TrendingUp, 
  Target, 
  Star, 
  Gift, 
  Crown,
  Zap,
  Eye,
  ThumbsUp,
  DollarSign,
  Calendar,
  BarChart3,
  Smile,
  Frown,
  Meh,
  Send,
  Bot,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { apiFetchBlob, apiFetchJson, ApiError, isUnauthorizedError } from '../utils/api';

type MarketingPriority = {
  title: string;
  rationale: string;
  impactScore: number;
  actions: string[];
  category: 'optimize' | 'scale' | 'protect';
};

type MarketingRecommendationsResponse = {
  storeId: string;
  generatedAt: string;
  priorities: MarketingPriority[];
  notes: string[];
  signals: string[];
};

type MarketingHistoryEntry = {
  timestamp: string;
  period: string;
  priorities: MarketingPriority[];
  notes: string[];
  signals: string[];
};

type RecommendationRow = {
  customer: string;
  customerName: string;
  dishes: string[];
  confidence: number;
  reason: string;
  expectedRevenue: number;
  priority: 'high' | 'medium' | 'low';
  category: 'upsell' | 'retention' | 'acquisition';
};

const goalPreferenceMap = {
  week: 'traffic',
  month: 'revenue',
  quarter: 'retention',
} as const;

const mapPrioritiesToRows = (priorities: MarketingPriority[] | undefined | null): RecommendationRow[] => {
  const safePriorities = Array.isArray(priorities) ? priorities : [];
  if (!safePriorities.length) {
    return [];
  }
  return safePriorities.map((priority) => {
    const confidence = Math.round(priority.impactScore * 100);
    const priorityTag =
      priority.category === 'scale'
        ? 'high'
        : priority.category === 'optimize'
        ? 'medium'
        : 'low';
    const strategy =
      priority.category === 'scale'
        ? 'acquisition'
        : priority.category === 'optimize'
        ? 'upsell'
        : 'retention';

    return {
      customer: priority.title,
      customerName: priority.title,
      dishes: priority.actions.length ? priority.actions : ['执行重点动作'],
      confidence,
      reason: priority.rationale,
      expectedRevenue: Math.max(60, Math.round(confidence * 1.6)),
      priority: priorityTag,
      category: strategy,
    };
  });
};

export const MarketingSystem: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('recommendations');
  const [aiRecommendations, setAiRecommendations] = useState<MarketingRecommendationsResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [recommendationsPage, setRecommendationsPage] = useState(1);
  const [analysisPage, setAnalysisPage] = useState(1);
  const recommendationsPerPage = 3; // 每页显示3条推荐
  const analysisPerPage = 3; // 每页显示3个客户
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<MarketingHistoryEntry[]>([]);

  const toArray = <T,>(maybe: T[] | undefined | null): T[] =>
    Array.isArray(maybe) ? maybe : [];

  const sanitizedHistoryItems = historyItems.map((entry) => ({
    ...entry,
    priorities: toArray(entry.priorities),
    notes: toArray(entry.notes),
    signals: toArray(entry.signals),
  }));

  const explainApiFailure = (error: unknown, fallback: string) => {
    if (isUnauthorizedError(error)) {
      return '演示鉴权未通过，请在左侧设置面板配置演示令牌。';
    }
    if (error instanceof ApiError) {
      return error.message;
    }
    return fallback;
  };

  // 会员数据
  const memberData = [
    {
      id: 1,
      name: '李先生',
      level: 'VIP',
      visits: 25,
      spending: 3200,
      lastVisit: '2024-01-14',
      preferences: ['川菜', '海鲜'],
      sentiment: 'positive',
      value: 'high'
    },
    {
      id: 2,
      name: '张女士',
      level: '金卡',
      visits: 18,
      spending: 2400,
      lastVisit: '2024-01-13',
      preferences: ['素食', '清淡'],
      sentiment: 'positive',
      value: 'high'
    },
    {
      id: 3,
      name: '王先生',
      level: '银卡',
      visits: 12,
      spending: 1600,
      lastVisit: '2024-01-12',
      preferences: ['家常菜', '经济实惠'],
      sentiment: 'neutral',
      value: 'medium'
    },
    {
      id: 4,
      name: '赵女士',
      level: '普通',
      visits: 8,
      spending: 800,
      lastVisit: '2024-01-10',
      preferences: ['西餐', '甜品'],
      sentiment: 'positive',
      value: 'medium'
    }
  ];

  // 个性化推荐数据
  const recommendations = [
    {
      customer: '李先生',
      dishes: ['麻婆豆腐', '水煮鱼', '宫保鸡丁'],
      confidence: 92,
      reason: '基于历史偏好和川菜类别',
      revenue: 180
    },
    {
      customer: '张女士',
      dishes: ['清蒸鲈鱼', '时蔬小炒', '银耳莲子汤'],
      confidence: 88,
      reason: '符合清淡健康饮食习惯',
      revenue: 120
    },
    {
      customer: '王先生',
      dishes: ['红烧肉', '蛋炒饭', '紫菜蛋花汤'],
      confidence: 85,
      reason: '家常菜偏好和价格敏感',
      revenue: 80
    }
  ];

  // 客户价值分析数据
  const customerValueData = [
    { name: 'VIP客户', value: 35, color: '#8b5cf6' },
    { name: '金卡客户', value: 25, color: '#f59e0b' },
    { name: '银卡客户', value: 20, color: '#6b7280' },
    { name: '普通客户', value: 20, color: '#10b981' }
  ];

  // 营销活动数据
  const campaignData = [
    {
      id: 1,
      name: '新春美食节',
      type: '节日活动',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-01-28',
      target: '全体客户',
      reach: 1250,
      engagement: 68,
      conversion: 12.5,
      revenue: 8500
    },
    {
      id: 2,
      name: 'VIP专享优惠',
      type: '会员营销',
      status: 'planned',
      startDate: '2024-01-20',
      endDate: '2024-01-27',
      target: 'VIP客户',
      reach: 150,
      engagement: 85,
      conversion: 25.8,
      revenue: 4200
    }
  ];

  // 情绪分析数据
  const sentimentData = [
    { date: '1/10', positive: 85, neutral: 12, negative: 3 },
    { date: '1/11', positive: 88, neutral: 10, negative: 2 },
    { date: '1/12', positive: 82, neutral: 15, negative: 3 },
    { date: '1/13', positive: 90, neutral: 8, negative: 2 },
    { date: '1/14', positive: 87, neutral: 11, negative: 2 }
  ];

  const collectMarketingSnapshot = () => {
    const totalRevenue = campaignData.reduce(
      (sum, campaign) => sum + (campaign.revenue ?? 0),
      0
    );
    const avgEngagement =
      campaignData.length > 0
        ? campaignData.reduce(
            (sum, campaign) => sum + (campaign.engagement ?? 0),
            0
          ) / campaignData.length
        : 0;
    const activeCampaigns = campaignData.filter(
      (campaign) => campaign.status === 'active'
    ).length;
    const plannedCampaigns = campaignData.filter(
      (campaign) => campaign.status === 'planned'
    ).length;

    return { totalRevenue, avgEngagement, activeCampaigns, plannedCampaigns };
  };

  const buildReportPayload = () => {
    const snapshot = collectMarketingSnapshot();
    return {
      storeId: aiRecommendations?.storeId ?? 'SH001',
      generatedAt: aiRecommendations?.generatedAt ?? new Date().toISOString(),
      period: selectedPeriod,
      periodLabel: resolvePeriodLabel(selectedPeriod),
      priorities: aiRecommendations?.priorities ?? [],
      notes: aiRecommendations?.notes ?? [],
      signals: aiRecommendations?.signals ?? [],
      campaigns: campaignData,
      sentiment: sentimentData,
      customerSegments: customerValueData,
      summaryMetrics: {
        projectedRevenue: snapshot.totalRevenue,
        averageEngagement: Number(snapshot.avgEngagement.toFixed(1)),
        activeCampaigns: snapshot.activeCampaigns,
        plannedCampaigns: snapshot.plannedCampaigns,
      },
    };
  };

  const handleRecommendationsPageChange = (page: number) => {
    setRecommendationsPage(page);
  };

  const handleAnalysisPageChange = (page: number) => {
    setAnalysisPage(page);
  };

  // 推荐分页计算
  const backendRecommendationRows = aiRecommendations ? mapPrioritiesToRows(aiRecommendations.priorities) : [];
  const currentRecommendations = backendRecommendationRows.length > 0 ? backendRecommendationRows : recommendations;
  const recommendationsTotalPages = Math.ceil(currentRecommendations.length / recommendationsPerPage);
  const recommendationsStartIndex = (recommendationsPage - 1) * recommendationsPerPage;
  const recommendationsEndIndex = recommendationsStartIndex + recommendationsPerPage;
  const recommendationsCurrentData = currentRecommendations.slice(recommendationsStartIndex, recommendationsEndIndex);

  // 客户分析分页计算
  const analysisTotalPages = Math.ceil(memberData.length / analysisPerPage);
  const analysisStartIndex = (analysisPage - 1) * analysisPerPage;
  const analysisEndIndex = analysisStartIndex + analysisPerPage;
  const analysisCurrentData = memberData.slice(analysisStartIndex, analysisEndIndex);

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const goalKey = selectedPeriod as keyof typeof goalPreferenceMap;
      const primaryGoal = goalPreferenceMap[goalKey] ?? 'revenue';
      const response = await apiFetchJson<MarketingRecommendationsResponse>('/marketing/recommendations', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 'SH001',
          preferences: { primaryGoal },
        }),
      });

      setAiRecommendations(response);
      setHistoryItems((prev) =>
        [
          {
            timestamp: response.generatedAt,
            period: selectedPeriod,
            priorities: toArray(response.priorities),
            notes: toArray(response.notes),
            signals: toArray(response.signals),
          },
          ...prev,
        ].slice(0, 20),
      );
      toast.success(`AI营销建议生成完成！共生成${response.priorities.length}条优先事项`);
    } catch (error) {
      toast.error(explainApiFailure(error, '营销建议生成失败，请稍后再试。'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchCampaign = (campaign: string) => {
    toast.success(`${campaign}活动已启动`);
  };

  const handleOpenHistory = () => {
    if (!historyItems.length && aiRecommendations) {
      setHistoryItems([
        {
          timestamp: aiRecommendations.generatedAt,
          period: selectedPeriod,
          priorities: toArray(aiRecommendations.priorities),
          notes: toArray(aiRecommendations.notes),
          signals: toArray(aiRecommendations.signals),
        },
      ]);
    }
    setHistoryOpen(true);
  };

  const downloadMarketingReport = async (payload: unknown, filename: string) => {
    const blob = await apiFetchBlob('/marketing/download-report', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const resolvePeriodLabel = (period: string) => {
    if (period === 'week') return '本周';
    if (period === 'quarter') return '本季度';
    return '本月';
  };

  const handleDownloadReport = async () => {
    if (!aiRecommendations) {
      toast.error('请先生成 AI 营销建议。');
      return;
    }

    setIsDownloading(true);
    try {
      const payload = buildReportPayload();
      const filename = `Marketing_Analysis_Report_${new Date().toISOString().split('T')[0]}.docx`;
      await downloadMarketingReport(payload, filename);
      toast.success('智能营销分析报告下载成功！');
    } catch (error) {
      toast.error(explainApiFailure(error, '报告下载失败，请稍后再试。'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能营销与顾客体验</h1>
          <p className="text-gray-600 mt-2">AI驱动的个性化营销和客户关系管理系统</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季度</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Bot className="w-4 h-4 animate-pulse" />
                  生成中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  AI营销建议
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={handleOpenHistory}>历史记录</Button>
            
            {aiRecommendations && (
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
      {/* 历史记录弹窗 */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>营销推荐历史</DialogTitle>
            <DialogDescription>最近生成的AI营销推荐</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {historyItems.length === 0 && (
              <div className="text-sm text-gray-500">暂无历史记录</div>
            )}
            {sanitizedHistoryItems.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <div className="font-medium">{new Date(item.timestamp).toLocaleString()}</div>
                  <Badge variant="secondary">{resolvePeriodLabel(item.period)}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <div>优先事项：{item.priorities.length}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await downloadMarketingReport(
                          {
                            ...buildReportPayload(),
                            generatedAt: item.timestamp,
                            priorities: item.priorities,
                            notes: item.notes,
                            signals: item.signals,
                            period: item.period,
                            periodLabel: resolvePeriodLabel(item.period),
                          },
                          `Marketing_Analysis_Report_${new Date(item.timestamp).toISOString().split('T')[0]}.docx`,
                        );
                        toast.success('历史营销报告下载成功');
                      } catch (error) {
                        toast.error(explainApiFailure(error, '下载失败，请稍后再试。'));
                      }
                    }}
                  >
                    下载报告
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">客户满意度</p>
                <p className="text-2xl font-bold text-green-600">4.8/5</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +0.3 vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">会员总数</p>
                <p className="text-2xl font-bold text-blue-600">1,856</p>
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">营销转化率</p>
                <p className="text-2xl font-bold text-purple-600">18.5%</p>
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +3.2% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">客户终身价值</p>
                <p className="text-2xl font-bold text-orange-600">¥2,340</p>
                <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +8.7% vs 上月
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* 主要功能区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">个性化推荐</TabsTrigger>
          <TabsTrigger value="analysis">客户分析</TabsTrigger>
          <TabsTrigger value="sentiment">情绪分析</TabsTrigger>
        </TabsList>

        {/* 个性化推荐 */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI推荐列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  AI个性化推荐
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendationsCurrentData.map((rec: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">{rec.customerName || rec.customer}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{rec.confidence}% 匹配</Badge>
                          {aiRecommendations && (
                            <Badge variant={
                              rec.priority === 'high' ? 'default' :
                              rec.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {rec.priority === 'high' ? '高优先级' :
                               rec.priority === 'medium' ? '中优先级' : '低优先级'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="text-sm text-gray-600">推荐菜品:</div>
                        <div className="flex flex-wrap gap-1">
                          {rec.dishes.map((dish: string, dishIndex: number) => (
                            <Badge key={dishIndex} variant="outline">
                              {dish}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-3">
                        推荐理由: {rec.reason}
                      </div>
                      
                      {aiRecommendations && (
                        <div className="text-xs text-blue-600 mb-3">
                          策略类型: {
                            rec.category === 'upsell' ? '提升客单价' :
                            rec.category === 'retention' ? '客户留存' :
                            rec.category === 'acquisition' ? '客户获取' : '其他'
                          }
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-green-600 font-medium">
                          预期收益: ¥{rec.expectedRevenue || rec.revenue}
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => toast.success(`已向${rec.customerName || rec.customer}发送个性化推荐`)}
                        >
                          发送推荐
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 推荐分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {recommendationsStartIndex + 1}-{Math.min(recommendationsEndIndex, currentRecommendations.length)} 条，共 {currentRecommendations.length} 条推荐
                  </div>
                  
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleRecommendationsPageChange(Math.max(1, recommendationsPage - 1))}
                          className={recommendationsPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: recommendationsTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleRecommendationsPageChange(page)}
                            isActive={recommendationsPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleRecommendationsPageChange(Math.min(recommendationsTotalPages, recommendationsPage + 1))}
                          className={recommendationsPage === recommendationsTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
                
                {aiRecommendations && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      AI营销洞察
                    </h4>
                    <div className="text-sm text-purple-700 space-y-1">
                      <div>• 基于客户价值和偏好生成了{backendRecommendationRows.length}条个性化推荐</div>
                      <div>• 高优先级推荐{backendRecommendationRows.filter((rec) => rec.priority === 'high').length}条，预期收益最高</div>
                      <div>• 建议优先执行高优先级推荐，提升客户满意度和收益</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 营销活动 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-600" />
                  营销活动管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaignData.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-sm text-gray-600">{campaign.type}</div>
                        </div>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status === 'active' ? '进行中' : '计划中'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-gray-600">目标客户</div>
                          <div className="font-medium">{campaign.target}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">覆盖人数</div>
                          <div className="font-medium">{campaign.reach}人</div>
                        </div>
                        <div>
                          <div className="text-gray-600">参与率</div>
                          <div className="font-medium text-blue-600">{campaign.engagement}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">转化率</div>
                          <div className="font-medium text-green-600">{campaign.conversion}%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-green-600 font-medium">
                          收益: ¥{campaign.revenue}
                        </div>
                        {campaign.status === 'planned' && (
                          <Button 
                            size="sm"
                            onClick={() => handleLaunchCampaign(campaign.name)}
                          >
                            启动活动
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 客户分析 */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 客户价值分布 */}
            <Card>
              <CardHeader>
                <CardTitle>客户价值分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerValueData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {customerValueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {customerValueData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 高价值客户详情 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  高价值客户分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>客户</TableHead>
                      <TableHead>等级</TableHead>
                      <TableHead>消费次数</TableHead>
                      <TableHead>总消费</TableHead>
                      <TableHead>偏好</TableHead>
                      <TableHead>价值</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisCurrentData.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>
                          <Badge variant={member.level === 'VIP' ? 'default' : 'secondary'}>
                            {member.level}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.visits}次</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ¥{member.spending}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.preferences.slice(0, 2).map((pref, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {pref}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            member.value === 'high' ? 'default' : 'secondary'
                          }>
                            {member.value === 'high' ? '高' : '中'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* 客户分析分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {analysisStartIndex + 1}-{Math.min(analysisEndIndex, memberData.length)} 个，共 {memberData.length} 个客户
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
          </div>
        </TabsContent>

        {/* 情绪分析 */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 情绪趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  客户情绪趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sentimentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="positive" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="正面"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="neutral" 
                        stroke="#6b7280" 
                        strokeWidth={2}
                        name="中性"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="negative" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="负面"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 情绪分析详情 */}
            <Card>
              <CardHeader>
                <CardTitle>实时情绪监控</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smile className="w-8 h-8 text-green-600" />
                      <div>
                        <div className="font-medium text-green-900">正面评价</div>
                        <div className="text-sm text-green-700">87%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">156</div>
                      <div className="text-sm text-green-600">条评论</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Meh className="w-8 h-8 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">中性评价</div>
                        <div className="text-sm text-gray-700">11%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-600">20</div>
                      <div className="text-sm text-gray-600">条评论</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Frown className="w-8 h-8 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">负面评价</div>
                        <div className="text-sm text-red-700">2%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">4</div>
                      <div className="text-sm text-red-600">条评论</div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">AI洞察</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 客户对新推出的川菜系列反响热烈</li>
                      <li>• 服务速度是客户满意度的关键因素</li>
                      <li>• 建议关注少数负面评价中的共同问题</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};
