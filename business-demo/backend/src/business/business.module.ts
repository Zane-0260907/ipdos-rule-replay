import { Module } from '@nestjs/common';
import { resolve } from 'node:path';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { BusinessStore } from './store';
import { RulesRegistryService } from '../rules/rules-registry.service';

@Module({ controllers: [BusinessController], providers: [BusinessService, RulesRegistryService, {
  provide: BusinessStore, useFactory: () => new BusinessStore(resolve(process.env.BUSINESS_DATA_FILE || 'local-data/simulation.sqlite')),
}] })
export class BusinessModule {}
