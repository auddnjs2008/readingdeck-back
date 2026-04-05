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
    const systemPrompt = `
            너는 사용자의 독서 기록을 바탕으로 답변하는 조수다.
            반드시 제공된 카드들만 근거로 답변하라.
            카드에 없는 사실을 지어내지 마라.
            모르면 모른다고 말하라.
            답변은 한국어로 간결하고 자연스럽게 작성하라.
            반드시 아래 JSON 형식으로만 응답하라.

            {
                "answer": "string",
                "sourceCardIds": [1, 2, 3]
            }
            `;

    const userPrompt = `
                사용자 질문: ${state.message}
                관련 카드들: ${JSON.stringify(state.retrievedCards, null, 2)}`;

    const result = await structuredModel.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const normalizedSourceCardIds = normalizeSourceCardIds(
      result.sourceCardIds,
      state.retrievedCards,
    );

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
