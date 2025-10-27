import { Test, TestingModule } from '@nestjs/testing';
import { CharacterStatsService } from './character-stats.service';

describe('CharacterStatsService', () => {
  let service: CharacterStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CharacterStatsService],
    }).compile();

    service = module.get<CharacterStatsService>(CharacterStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
