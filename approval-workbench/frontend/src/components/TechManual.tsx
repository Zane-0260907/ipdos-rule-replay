import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

export const TechManual: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技术手册</h1>
          <p className="text-gray-600 mt-2">API 说明、数据结构与使用指南</p>
        </div>
        <Badge variant="secondary">v1.0</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="predictions">智能预测</TabsTrigger>
          <TabsTrigger value="inventory">库存管理</TabsTrigger>
          <TabsTrigger value="scheduling">智能排班</TabsTrigger>
          <TabsTrigger value="alerts">智能预警</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>能为您带来什么</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>用 AI 预测销量与客流，高峰/低谷一目了然，减少断货与浪费。</li>
                <li>给出可执行的订货与菜单建议，直接落地到备货、上/下架与排班。</li>
                <li>全链路可解释：看到每一次调整“因为什么、会带来什么效果”。</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>三步快速使用</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-1">
                <li>进入“智能预测”，选择日期后查看订货建议与客流曲线。</li>
                <li>点击“确认订货”，系统会生成并提交订货单。</li>
                <li>在“库存/排班/预警”模块查看联动建议与执行结果。</li>
              </ol>
              <div className="text-xs text-gray-500 mt-3">演示环境 Base URL: http://localhost:3002（已内置，无需登录）。</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>销售预测 /predictions/sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：给出每天/每小时的商品订货量，附带影响因素说明与历史趋势。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /predictions/sales
Body: { targetDate: "2025-09-23", storeId: "SH001" }
Resp: [ { id, ingredient, predictedAmount, unit, currentStock, experienceAmount, factors[], historicalData[] } ]`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>客流预测 /predictions/traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：识别早餐/午餐/晚餐高峰时段，用于排班与备货节奏。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /predictions/traffic
Body: { targetDate: "2025-09-23", storeId: "SH001" }
Resp: [ { time, customers, prediction } ]`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>因素详情 /predictions/factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：解释“为什么是这个结果”，便于向团队说明与复盘。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /predictions/factors
Body: { targetDate }
Resp: { date:{title,description,details[]}, activity:{...}, weather:{...} }`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>菜单建议 /predictions/menu-adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：在毛利、产能与缺货风险之间做平衡，给出上/下架与备货建议。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /predictions/menu-adjustments
Body: { items?: [{ ingredient, margin, risk, stock }] }
Resp: { up:[{ingredient,reason}], down:[...], suggestions:[{ingredient,restock}] }`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>评估 /predictions/evaluate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：实时看到“预测是否靠谱”，系统会据此自我校准。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /predictions/evaluate
Body: { actual:[number], predicted:[number] }
Resp: { mape, rmse, coverageP50, n }`}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>确认订货 /orders/confirm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-2">效果：一键下发订货单，返回预计到货时间，便于前厅与后厨协同。</div>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{`POST /orders/confirm
Body: { date, store, items:[{ ingredient, amount, unit }] }
Resp: { success, orderId, eta }`}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>库存管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">说明接口与字段将随后补充。</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle>智能排班</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">说明接口与字段将随后补充。</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>智能预警</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700">说明接口与字段将随后补充。</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


