import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertTriangle, Package, Search, Filter, RefreshCw, Calendar, Clock, TrendingDown } from 'lucide-react';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';

const inventoryData = [
  {
    id: 1,
    name: '土豆',
    currentStock: 8.2,
    unit: 'kg',
    safeStock: 15,
    maxStock: 50,
    price: 4.5,
    supplier: '新发地批发',
    lastUpdated: '2小时前',
    status: 'low',
    expiryDate: '2025-09-30',
    daysToExpiry: 7,
    expiryStatus: 'warning',
    category: '蔬菜',
    purchaseDate: '2025-09-20',
    wasteAmount: 0.5,
    wasteRate: 6.1
  },
  {
    id: 2,
    name: '鸡胸肉',
    currentStock: 5.5,
    unit: 'kg',
    safeStock: 10,
    maxStock: 30,
    price: 18.0,
    supplier: '华润万家',
    lastUpdated: '1小时前',
    status: 'critical',
    expiryDate: '2025-09-25',
    daysToExpiry: 2,
    expiryStatus: 'critical',
    category: '肉类',
    purchaseDate: '2025-09-22',
    wasteAmount: 0.8,
    wasteRate: 12.7
  },
  {
    id: 3,
    name: '青椒',
    currentStock: 3.8,
    unit: 'kg',
    safeStock: 8,
    maxStock: 25,
    price: 6.2,
    supplier: '蔬菜基地',
    lastUpdated: '30分钟前',
    status: 'critical',
    expiryDate: '2025-09-26',
    daysToExpiry: 3,
    expiryStatus: 'warning',
    category: '蔬菜',
    purchaseDate: '2025-09-21',
    wasteAmount: 0.3,
    wasteRate: 7.3
  },
  {
    id: 4,
    name: '胡萝卜',
    currentStock: 12.1,
    unit: 'kg',
    safeStock: 6,
    maxStock: 20,
    price: 3.8,
    supplier: '蔬菜基地',
    lastUpdated: '1小时前',
    status: 'normal',
    expiryDate: '2025-10-05',
    daysToExpiry: 12,
    expiryStatus: 'normal',
    category: '蔬菜',
    purchaseDate: '2025-09-18',
    wasteAmount: 0.2,
    wasteRate: 1.6
  },
  {
    id: 5,
    name: '大米',
    currentStock: 15.8,
    unit: 'kg',
    safeStock: 20,
    maxStock: 100,
    price: 5.5,
    supplier: '粮油批发',
    lastUpdated: '45分钟前',
    status: 'low',
    expiryDate: '2026-03-15',
    daysToExpiry: 173,
    expiryStatus: 'normal',
    category: '主食',
    purchaseDate: '2025-09-15',
    wasteAmount: 0.1,
    wasteRate: 0.6
  },
  {
    id: 6,
    name: '西红柿',
    currentStock: 6.8,
    unit: 'kg',
    safeStock: 8,
    maxStock: 30,
    price: 8.0,
    supplier: '蔬菜基地',
    lastUpdated: '1小时前',
    status: 'normal',
    expiryDate: '2025-09-28',
    daysToExpiry: 5,
    expiryStatus: 'warning',
    category: '蔬菜',
    purchaseDate: '2025-09-21',
    wasteAmount: 0.4,
    wasteRate: 5.6
  },
  {
    id: 7,
    name: '猪肉',
    currentStock: 12.8,
    unit: 'kg',
    safeStock: 15,
    maxStock: 40,
    price: 28.0,
    supplier: '肉类批发',
    lastUpdated: '2小时前',
    status: 'low',
    expiryDate: '2025-09-27',
    daysToExpiry: 4,
    expiryStatus: 'warning',
    category: '肉类',
    purchaseDate: '2025-09-20',
    wasteAmount: 0.6,
    wasteRate: 4.5
  },
  {
    id: 8,
    name: '豆腐',
    currentStock: 8.5,
    unit: '块',
    safeStock: 10,
    maxStock: 25,
    price: 6.0,
    supplier: '豆制品厂',
    lastUpdated: '30分钟前',
    status: 'normal',
    expiryDate: '2025-09-24',
    daysToExpiry: 1,
    expiryStatus: 'critical',
    category: '豆制品',
    purchaseDate: '2025-09-22',
    wasteAmount: 0.3,
    wasteRate: 3.4
  }
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'critical':
      return { label: '紧急补货', variant: 'destructive' as const, color: 'text-red-600' };
    case 'low':
      return { label: '库存偏低', variant: 'default' as const, color: 'text-orange-600' };
    case 'normal':
      return { label: '库存正常', variant: 'secondary' as const, color: 'text-green-600' };
    default:
      return { label: '未知', variant: 'secondary' as const, color: 'text-gray-600' };
  }
};

const getExpiryStatusInfo = (status: string) => {
  switch (status) {
    case 'critical':
      return { label: '即将过期', variant: 'destructive' as const, color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'warning':
      return { label: '注意保质期', variant: 'default' as const, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'normal':
      return { label: '保质期正常', variant: 'secondary' as const, color: 'text-green-600', bgColor: 'bg-green-50' };
    default:
      return { label: '未知', variant: 'secondary' as const, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

export const InventoryManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory');
  const [currentPage, setCurrentPage] = useState(1);
  const [expiryPage, setExpiryPage] = useState(1);
  const [wastePage, setWastePage] = useState(1);
  const itemsPerPage = 5; // 每页显示5条数据

  const filteredData = inventoryData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // 当搜索或筛选条件改变时，重置到第一页
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // 分页计算
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExpiryPageChange = (page: number) => {
    setExpiryPage(page);
  };

  const handleWastePageChange = (page: number) => {
    setWastePage(page);
  };

  // 保质期管理分页计算
  const expiryTotalPages = Math.ceil(inventoryData.length / itemsPerPage);
  const expiryStartIndex = (expiryPage - 1) * itemsPerPage;
  const expiryEndIndex = expiryStartIndex + itemsPerPage;
  const expiryCurrentData = inventoryData.slice(expiryStartIndex, expiryEndIndex);

  // 损耗分析分页计算
  const wasteTotalPages = Math.ceil(inventoryData.length / itemsPerPage);
  const wasteStartIndex = (wastePage - 1) * itemsPerPage;
  const wasteEndIndex = wasteStartIndex + itemsPerPage;
  const wasteCurrentData = inventoryData.slice(wasteStartIndex, wasteEndIndex);

  // 计算统计数据
  const totalItems = inventoryData.length;
  const criticalItems = inventoryData.filter(item => item.status === 'critical').length;
  const lowStockItems = inventoryData.filter(item => item.status === 'low').length;
  const expiringItems = inventoryData.filter(item => item.expiryStatus === 'critical').length;
  const totalWaste = inventoryData.reduce((sum, item) => sum + item.wasteAmount, 0);
  const avgWasteRate = inventoryData.reduce((sum, item) => sum + item.wasteRate, 0) / totalItems;

  return (
    <div className="space-y-6">
      {/* 库存概览卡片 - 一行显示 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold">{totalItems}</p>
                <p className="text-xs text-gray-600">总库存品种</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-lg font-bold text-red-600">{criticalItems}</p>
                <p className="text-xs text-gray-600">紧急补货</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-lg font-bold text-orange-600">{lowStockItems}</p>
                <p className="text-xs text-gray-600">库存偏低</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-lg font-bold text-purple-600">{expiringItems}</p>
                <p className="text-xs text-gray-600">即将过期</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-600">{avgWasteRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">平均损耗率</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签页界面 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">库存管理</TabsTrigger>
          <TabsTrigger value="expiry">保质期管理</TabsTrigger>
          <TabsTrigger value="waste">损耗分析</TabsTrigger>
          <TabsTrigger value="smart">智能建议</TabsTrigger>
        </TabsList>

        {/* 库存管理标签页 */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  库存明细
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="搜索食材..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    筛选
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>食材名称</TableHead>
                    <TableHead>当前库存</TableHead>
                    <TableHead>库存状态</TableHead>
                    <TableHead>库存占比</TableHead>
                    <TableHead>单价</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((item) => {
                    const stockPercentage = (item.currentStock / item.maxStock) * 100;
                    const statusInfo = getStatusInfo(item.status);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.currentStock}{item.unit}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress 
                              value={stockPercentage} 
                              className="h-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {stockPercentage.toFixed(0)}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>¥{item.price}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.supplier}</TableCell>
                        <TableCell className="text-sm text-gray-500">{item.lastUpdated}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            补货
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* 分页信息和控件 */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  显示 {startIndex + 1}-{Math.min(endIndex, filteredData.length)} 条，共 {filteredData.length} 条库存记录
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
        </TabsContent>

        {/* 保质期管理标签页 */}
        <TabsContent value="expiry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                保质期管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 即将过期食材 */}
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-3">即将过期食材 (3天内)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inventoryData.filter(item => item.daysToExpiry <= 3).map(item => (
                      <div key={item.id} className="p-3 bg-white rounded border border-red-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="destructive">{item.daysToExpiry}天</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          库存: {item.currentStock}{item.unit} | 过期: {item.expiryDate}
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="outline">优先使用</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 保质期表格 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>食材名称</TableHead>
                      <TableHead>当前库存</TableHead>
                      <TableHead>采购日期</TableHead>
                      <TableHead>保质期</TableHead>
                      <TableHead>剩余天数</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryCurrentData.map((item) => {
                      const expiryInfo = getExpiryStatusInfo(item.expiryStatus);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.currentStock}{item.unit}</TableCell>
                          <TableCell className="text-sm">{item.purchaseDate}</TableCell>
                          <TableCell className="text-sm">{item.expiryDate}</TableCell>
                          <TableCell>
                            <span className={expiryInfo.color}>
                              {item.daysToExpiry}天
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={expiryInfo.variant}>
                              {expiryInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">处理</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* 保质期管理分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {expiryStartIndex + 1}-{Math.min(expiryEndIndex, inventoryData.length)} 条，共 {inventoryData.length} 条保质期记录
                  </div>
                  
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleExpiryPageChange(Math.max(1, expiryPage - 1))}
                          className={expiryPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: expiryTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleExpiryPageChange(page)}
                            isActive={expiryPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleExpiryPageChange(Math.min(expiryTotalPages, expiryPage + 1))}
                          className={expiryPage === expiryTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 损耗分析标签页 */}
        <TabsContent value="waste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                损耗分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 损耗概览 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-900">总损耗量</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{totalWaste.toFixed(1)}kg</p>
                    <p className="text-sm text-red-700">本月累计</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-orange-900">平均损耗率</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{avgWasteRate.toFixed(1)}%</p>
                    <p className="text-sm text-orange-700">行业平均: 8.5%</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">节省金额</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">¥{(totalWaste * 15).toFixed(0)}</p>
                    <p className="text-sm text-green-700">相比上月</p>
                  </div>
                </div>

                {/* 损耗详情表格 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>食材名称</TableHead>
                      <TableHead>损耗量</TableHead>
                      <TableHead>损耗率</TableHead>
                      <TableHead>主要原因</TableHead>
                      <TableHead>建议措施</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wasteCurrentData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.wasteAmount}kg</TableCell>
                        <TableCell>
                          <span className={item.wasteRate > 5 ? 'text-red-600' : 'text-green-600'}>
                            {item.wasteRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.wasteRate > 10 ? '过期损耗' : 
                           item.wasteRate > 5 ? '存储不当' : '正常损耗'}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            {item.wasteRate > 10 ? '优化采购' : 
                             item.wasteRate > 5 ? '改善存储' : '维持现状'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* 损耗分析分页信息和控件 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    显示 {wasteStartIndex + 1}-{Math.min(wasteEndIndex, inventoryData.length)} 条，共 {inventoryData.length} 条损耗记录
                  </div>
                  
                  <Pagination className="justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handleWastePageChange(Math.max(1, wastePage - 1))}
                          className={wastePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: wasteTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleWastePageChange(page)}
                            isActive={wastePage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handleWastePageChange(Math.min(wasteTotalPages, wastePage + 1))}
                          className={wastePage === wasteTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 智能建议标签页 */}
        <TabsContent value="smart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                AI智能建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 智能订货建议 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">智能订货建议</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">鸡胸肉</span>
                        <Badge variant="secondary">紧急</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        建议采购: 15kg | 预计使用: 3天 | 供应商: 华润万家
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">青椒</span>
                        <Badge variant="default">注意</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        建议采购: 12kg | 预计使用: 4天 | 供应商: 蔬菜基地
                      </div>
                    </div>
                  </div>
                </div>

                {/* 库存优化建议 */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">库存优化建议</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">减少大米库存</span>
                        <Badge variant="secondary">优化</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        当前库存过高，建议减少采购量至20kg，可节省存储成本
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">增加土豆采购</span>
                        <Badge variant="default">建议</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        根据销售趋势，建议增加土豆采购量至30kg
                      </div>
                    </div>
                  </div>
                </div>

                {/* 成本优化建议 */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-3">成本优化建议</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">供应商优化</span>
                        <Badge variant="secondary">节省</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        建议与蔬菜基地签订长期合同，可节省采购成本15%
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">损耗控制</span>
                        <Badge variant="default">重要</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        通过改善存储条件，预计可减少损耗率至3%以下
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};