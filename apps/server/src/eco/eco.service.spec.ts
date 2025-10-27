import { Test, TestingModule } from '@nestjs/testing';
import { EcoService } from './eco.service';

describe('EcoService', () => {
  let service: EcoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcoService],
    }).compile();

    service = module.get<EcoService>(EcoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
