import { Body, Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessService } from './business.service';
import { ConfirmDto, InventoryChangeDto, LoginDto, PreviewDto, ReviewDto } from './dto';

@Controller()
export class BusinessController {
  constructor(private readonly business: BusinessService) {}
  @Get('health') health() { return { synthetic: true, service: 'IPDOS isolated business flow', storage: 'local SQLite', supplierExecution: false }; }
  @Post('auth/login') login(@Body() body: LoginDto) { return this.business.login(body.role); }
  @Get('procurement/context') context(@Headers('authorization') auth: string) { this.business.actor(auth); return this.business.context(); }
  @Post('predictions/sales') sales(@Headers('authorization') auth: string) {
    this.business.actor(auth); const c = this.business.context();
    return { store: { code: c.source.forecast.storeId, name: '合成演示门店' }, ...c.source.forecast, inputVersion: c.inputVersion, items: c.items, rules: c.rules, synthetic: true };
  }
  @Post('predictions/traffic') traffic(@Headers('authorization') auth: string) { this.business.actor(auth); const c = this.business.context(); return { points: c.source.forecast.traffic, snapshotId: c.source.forecast.id, synthetic: true }; }
  @Get('inventory') inventory(@Headers('authorization') auth: string) { this.business.actor(auth); return this.business.context(); }
  @Post('procurement/plans') preview(@Headers('authorization') auth: string, @Body() body: PreviewDto) { this.business.actor(auth); return this.business.preview(body); }
  @Post('procurement/plans/:id/review') review(@Headers('authorization') auth: string, @Param('id') id: string, @Body() body: ReviewDto) {
    return this.business.review(id, body.contentHash, body.acknowledged, this.business.actor(auth, true));
  }
  @Post('orders/confirm') confirm(@Headers('authorization') auth: string, @Headers('idempotency-key') key: string | undefined, @Body() body: ConfirmDto) {
    return this.business.confirm(body, key, this.business.actor(auth, true));
  }
  @Get('orders') orders(@Headers('authorization') auth: string) { this.business.actor(auth); return { orders: this.business.orders() }; }
  @Get('orders/:id') order(@Headers('authorization') auth: string, @Param('id') id: string) { this.business.actor(auth); return this.business.order(id); }
  @Get('orders/:id/report') async report(@Headers('authorization') auth: string, @Param('id') id: string, @Res() response: Response) {
    this.business.actor(auth);
    const bytes = await this.business.report(id);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    response.setHeader('Content-Disposition', `attachment; filename="${id}.docx"`);
    response.send(bytes);
  }
  @Post('procurement/demo/inventory') changeInventory(@Headers('authorization') auth: string, @Body() body: InventoryChangeDto) {
    this.business.actor(auth, true); return this.business.changeInventory(body);
  }
}
