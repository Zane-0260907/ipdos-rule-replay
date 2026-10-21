import { Module } from '@nestjs/common';
import { RulesRegistryService } from '../rules/rules-registry.service';
import { ReplayController } from './replay.controller';
import { ReplayService } from './replay.service';

@Module({
  controllers: [ReplayController],
  providers: [RulesRegistryService, ReplayService],
})
export class ReplayModule {}
