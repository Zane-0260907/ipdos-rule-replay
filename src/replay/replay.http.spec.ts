import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Server } from 'node:http';
import { ReplayService } from './replay.service';
import { ReplayModule } from './replay.module';

describe('database-free replay HTTP API', () => {
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ReplayModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('serves the new local interface and synthetic catalog', async () => {
    const page = await request(app.getHttpServer())
      .get('/demo')
      .expect(200)
      .expect('Content-Type', /html/);
    expect(page.text).toContain('NEW LOCAL DEMONSTRATOR');
    const catalog = await request(app.getHttpServer())
      .get('/demo/api/catalog')
      .expect(200);
    const catalogBody = catalog.body as ReturnType<ReplayService['catalog']>;
    expect(catalogBody.dataOrigin).toBe('synthetic');
    expect(catalogBody.scenarios).toHaveLength(10);
  });

  it('returns the same content digests via HTTP and preserves the regression assertion', async () => {
    const body = {
      scenarioId: 'traffic-three',
      baselineId: 'registry-v1',
      candidateId: 'sparse-v2-seeded-regression',
    };
    const first = await request(app.getHttpServer())
      .post('/demo/api/compare')
      .send(body)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/demo/api/compare')
      .send(body)
      .expect(201);
    expect(first.body).toEqual(second.body);
    const comparison = first.body as ReturnType<ReplayService['compare']>;
    expect(comparison.candidate.assertion.passed).toBe(false);
    expect(comparison.delta.removed).toEqual([
      'predictions.traffic.low-resolution',
    ]);
  });

  it('exports a complete JSON bundle as an attachment', async () => {
    const result = await request(app.getHttpServer())
      .get('/demo/api/export/traffic-three/registry-v1')
      .expect(200)
      .expect('Content-Disposition', /attachment/);
    const bundle = result.body as ReturnType<ReplayService['run']>;
    if (bundle.scenario.snapshot.domain !== 'traffic')
      throw new Error('Unexpected export domain');
    expect(bundle.scenario.snapshot.payload.points).toHaveLength(3);
    expect(bundle.policy.parameters.minTrafficPoints).toBe(8);
    expect(bundle.trace).toHaveLength(3);
    expect(bundle.contentDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects unknown IDs, invalid bodies and additional fields', async () => {
    await request(app.getHttpServer())
      .post('/demo/api/compare')
      .send({ scenarioId: 'unknown' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/demo/api/compare')
      .send({
        scenarioId: 'traffic-three',
        baselineId: 'registry-v1',
        candidateId: 'registry-v1',
        arbitrary: 1,
      })
      .expect(400);
    await request(app.getHttpServer())
      .get('/demo/api/export/unknown/registry-v1')
      .expect(404);
  });

  it('runs the complete ten-scenario suite', async () => {
    const result = await request(app.getHttpServer())
      .get('/demo/api/suite')
      .expect(200);
    const suite = result.body as ReturnType<ReplayService['suite']>;
    expect(suite.summary).toEqual({
      scenarios: 10,
      baselinePassed: 10,
      candidatePassed: 9,
      changedScenarios: 1,
      ruleEvaluationsPerPolicy: 30,
    });
  });
});
