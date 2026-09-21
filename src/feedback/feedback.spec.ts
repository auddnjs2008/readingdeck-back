import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entity/feedback.entity';
import { FeedbackService } from './feedback.service';

it('비회원 의견의 유형과 답변 이메일을 저장한다', async () => {
  const create = jest.fn((input) => input);
  const save = jest.fn().mockResolvedValue({});
  const service = new FeedbackService({
    create,
    save,
  } as unknown as Repository<Feedback>);
  const dto = plainToInstance(CreateFeedbackDto, {
    message: '  화면이 불편해요  ',
    category: 'problem',
    replyEmail: ' reader@example.com ',
    pagePath: '/books',
  });
  expect(await validate(dto)).toHaveLength(0);
  expect(await service.createFeedback(dto)).toEqual({ ok: true });
  expect(save).toHaveBeenCalledWith({
    userId: null,
    message: '화면이 불편해요',
    category: 'problem',
    replyEmail: 'reader@example.com',
    pagePath: '/books',
  });
});

it('기존 AI 평가 요청은 연락처 없이 저장된다', async () => {
  const save = jest.fn().mockResolvedValue({});
  const service = new FeedbackService({
    create: (input: unknown) => input,
    save,
  } as unknown as Repository<Feedback>);
  await service.createFeedback({ message: '[AI_REACTION] up' }, 7);
  expect(save).toHaveBeenCalledWith({
    userId: 7,
    message: '[AI_REACTION] up',
    pagePath: null,
    category: null,
    replyEmail: null,
  });
});

it.each([
  { message: '   ' },
  { message: '의견입니다', category: 'invalid' },
  { message: '의견입니다', replyEmail: 'not-email' },
  { message: '의견입니다', replyEmail: 123 },
])('잘못된 입력을 거절한다: %j', async (input) => {
  expect(
    (await validate(plainToInstance(CreateFeedbackDto, input))).length,
  ).toBeGreaterThan(0);
});

it('빈 이메일은 선택하지 않은 것으로 처리한다', async () => {
  const dto = plainToInstance(CreateFeedbackDto, {
    message: '의견입니다',
    replyEmail: '  ',
  });
  expect(await validate(dto)).toHaveLength(0);
  expect(dto).toHaveProperty('replyEmail', undefined);
});
