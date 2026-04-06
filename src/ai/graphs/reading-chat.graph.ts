import { Annotation, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { CardEmbeddingService } from 'src/card-embedding/card-embedding.service';
import z from 'zod';

const ReadingChatAnnotation = Annotation.Root({
  userId: Annotation<number>,
  message: Annotation<string>,
  limit: Annotation<number>,
  retrievedCards: Annotation<any[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  answer: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  sourceCardIds: Annotation<number[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
});

export type ReadingChatState = typeof ReadingChatAnnotation.State;

function normalizeSourceCardIds(
  sourceCardIds: number[],
  retrievedCards: { cardId: number }[],
) {
  const allowedIds = new Set(retrievedCards.map((card) => card.cardId));

  return sourceCardIds.filter((id) => allowedIds.has(id));
}

const ReadingChatAnswerSchema = z.object({
  answer: z.string(),
  sourceCardIds: z.array(z.number()),
});

export function createReadingChatGraph(
  cardEmbeddingService: CardEmbeddingService,
) {
  const model = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.2,
  });

  const structuredModel = model.withStructuredOutput(ReadingChatAnswerSchema, {
    name: 'reading_chat_answer',
    method: 'functionCalling',
  });

  const retrieveCards = async (state: ReadingChatState) => {
    const relevantCards = await cardEmbeddingService.searchRelevantCards(
      state.userId,
      state.message,
      state.limit,
    );

    const cardIds = relevantCards.map((card) => card.cardId);
    const cards = await cardEmbeddingService.getCardsByIds(cardIds);

    return {
      retrievedCards: cards,
      sourceCardIds: cardIds,
    };
  };

  const generateAnswer = async (state: ReadingChatState) => {
    if (state.retrievedCards.length === 0) {
      return {
        answer:
          '아직 이 질문과 직접 연결되는 독서 기록을 충분히 찾지 못했어요. 다른 표현으로 다시 물어보거나 더 많은 카드를 남겨보세요.',
        sourceCardIds: [],
      };
    }

    const systemPrompt = `
너는 사용자의 독서 기록을 해석해 주는 조수다.
반드시 제공된 카드들만 근거로 답변하라.
카드에 없는 사실이나 책 내용을 지어내지 마라.
이 답변은 책 요약이 아니라, 사용자가 남긴 독서 기록을 해석하는 답변이어야 한다.
질문을 하나의 고정된 카테고리로 억지로 분류하지 말고, 질문이 실제로 원하는 바를 읽어라.
질문과 직접 관련 있는 카드만 사용하라.
답변은 먼저 질문에 직접 답하고, 그 다음에 카드들에서 드러나는 공통된 관점이나 패턴을 짧게 설명하라.
비슷한 카드가 여러 장이면 공통된 관점이나 패턴을 묶어서 설명하라.
질문이 과거 생각이나 관점을 묻는다면 thought를 중심으로 요약하라.
질문이 인용구, 문장, 구절을 묻는다면 quote를 우선 참고하되, thought가 있으면 함께 반영하라.
질문이 두 책이나 여러 주제를 함께 묻는다면 카드들 사이의 공통점과 차이점을 정리하라.
질문이 사용자의 성향, 반복, 패턴을 묻는다면 개별 카드를 나열하기보다 반복적으로 보이는 관점을 묶어서 설명하라.
근거가 약하면 모른다고 솔직히 말하라.
답변은 한국어로 간결하고 자연스럽게 작성하라.
책의 줄거리나 일반론을 길게 설명하지 마라.
답변 길이는 보통 2~4문장 정도로 유지하라. 길어지더라도 불필요한 서론은 쓰지 마라.
sourceCardIds에는 실제 답변에 기여한 카드 id만 포함하라.
sourceCardIds는 최대 3개까지만 반환하라.
반드시 아래 JSON 형식으로만 응답하라.

{
  "answer": "string",
  "sourceCardIds": [1, 2, 3]
}
`;

    const userPrompt = `
사용자 질문:
${state.message}

관련 카드들:
${JSON.stringify(state.retrievedCards, null, 2)}

답변 원칙:
- 질문 의도를 먼저 파악하고 그 의도에 맞는 방식으로 답하라.
- 관련 카드가 여러 장이면 카드별 나열보다 묶어서 설명하라.
- quote가 필요 없는 질문이면 quote를 억지로 인용하지 마라.
- thought와 quote가 함께 있으면, 사용자의 해석(thought)을 우선하고 quote는 뒷받침 근거로 써라.`;

    const result = await structuredModel.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const normalizedSourceCardIds = normalizeSourceCardIds(
      result.sourceCardIds,
      state.retrievedCards,
    ).slice(0, 3);

    return {
      answer:
        result.answer?.trim() ||
        '관련된 독서 기록을 바탕으로 답변을 정리하지 못했습니다.',
      sourceCardIds:
        normalizedSourceCardIds.length > 0
          ? normalizedSourceCardIds
          : state.sourceCardIds,
    };
  };

  return new StateGraph(ReadingChatAnnotation)
    .addNode('retrieveCards', retrieveCards)
    .addNode('generateAnswer', generateAnswer)
    .addEdge('__start__', 'retrieveCards')
    .addEdge('retrieveCards', 'generateAnswer')
    .addEdge('generateAnswer', '__end__')
    .compile();
}
