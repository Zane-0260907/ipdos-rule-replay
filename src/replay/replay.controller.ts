import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPLAY_POLICIES, REPLAY_SCENARIOS } from './replay-fixtures';
import { ReplayService } from './replay.service';

export class CompareReplayDto {
  @IsIn(REPLAY_SCENARIOS.map((entry) => entry.id))
  scenarioId!: string;

  @IsIn(REPLAY_POLICIES.map((entry) => entry.id))
  baselineId!: string;

  @IsIn(REPLAY_POLICIES.map((entry) => entry.id))
  candidateId!: string;
}

@Controller('demo')
export class ReplayController {
  constructor(private readonly replay: ReplayService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page() {
    return readFileSync(join(process.cwd(), 'public/replay.html'), 'utf8');
  }

  @Get('api/catalog')
  catalog() {
    return this.replay.catalog();
  }

  @Get('api/suite')
  suite() {
    return this.replay.suite();
  }

  @Post('api/compare')
  compare(@Body() body: CompareReplayDto) {
    return this.replay.compare(
      body.scenarioId,
      body.baselineId,
      body.candidateId,
    );
  }

  @Get('api/export/:scenarioId/:policyId')
  @Header('Content-Type', 'application/json; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ipdos-replay.json"')
  export(
    @Param('scenarioId') scenarioId: string,
    @Param('policyId') policyId: string,
  ) {
    return this.replay.run(scenarioId, policyId);
  }
}
