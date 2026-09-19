/// <reference types="jest" />

import { Repository } from 'typeorm';
import { AiChatUsageService } from './ai-chat-usage.service';
import { AiChatUsage } from './entity/ai-chat-usage.entity';
import { AiService } from './ai.service';
import { createReadingChatGraph } from './graphs/reading-chat.graph';

jest.mock('./graphs/reading-chat.graph', () => ({
  createReadingChatGraph: jest.fn(),
}));
jest.mock('src/card-embedding/card-embedding.service', () => ({
  CardEmbeddingService: class {},
}));
jest.mock('./ai-help-document.service', () => ({
  AiHelpDocumentService: class {},
}));

describe('AI chat usage', () => {
  const repository = { findOne: jest.fn(), query: jest.fn() };
  const usage = new AiChatUsageService(
    repository as unknown as Repository<AiChatUsage>,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-19T23:59:59Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('미사용 계정의 한도와 다음 초기화 시각을 쓰기 없이 조회한다', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(usage.getUsage(7)).resolves.toEqual({
      limit: 10,
      remaining: 10,
      resetsAt: '2026-09-20T00:00:00.000Z',
    });
    expect(repository.query).not.toHaveBeenCalled();
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: 7, date: '2026-09-19' },
    });
  });

  it('10회 소진 시 추가 예약을 거절한다', async () => {
    repository.query.mockResolvedValue([]);
    await expect(usage.reserve(7)).rejects.toMatchObject({ status: 429 });
  });

  it('자정 이후 실패해도 예약한 날짜의 사용량을 복구한다', async () => {
    repository.query.mockResolvedValue([{ count: 10 }]);
    const date = await usage.reserve(7);
    jest.setSystemTime(new Date('2026-09-20T00:00:01Z'));
    await usage.refund(7, date);
    expect(repository.query.mock.calls[1][1]).toEqual([7, '2026-09-19']);
    repository.findOne.mockResolvedValue(null);
    await expect(usage.getUsage(7)).resolves.toMatchObject({
      remaining: 10,
      resetsAt: '2026-09-21T00:00:00.000Z',
    });
  });

  it.each([false, true])(
    'AI 응답 성공 여부에 따라 실패만 환불한다 (실패: %s)',
    async (fails) => {
      const error = new Error('model unavailable');
      const invoke = jest.fn();
      if (fails) invoke.mockRejectedValue(error);
      else
        invoke.mockResolvedValue({
          answer: 'answer',
          retrievedCards: [],
          sourceCardIds: [],
        });
      jest
        .mocked(createReadingChatGraph)
        .mockReturnValue({ invoke } as unknown as ReturnType<
          typeof createReadingChatGraph
        >);
      const quota = {
        reserve: jest.fn().mockResolvedValue('2026-09-19'),
        refund: jest.fn().mockResolvedValue(undefined),
      };
      const threads = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({ id: 'thread' }),
      };
      const messages = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockResolvedValue([]),
      };
      const service = new AiService(
        {} as never,
        {} as never,
        quota as unknown as AiChatUsageService,
        threads as never,
        messages as never,
      );
      const result = service.chat(7, { message: 'question' });
      if (fails) {
        await expect(result).rejects.toBe(error);
        expect(quota.refund).toHaveBeenCalledWith(7, '2026-09-19');
      } else {
        await expect(result).resolves.toMatchObject({ answer: 'answer' });
        expect(quota.refund).not.toHaveBeenCalled();
      }
      expect(quota.reserve).toHaveBeenCalledTimes(1);
    },
  );
});
