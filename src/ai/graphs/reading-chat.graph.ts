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
  history: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  rewrittenQuery: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
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

  const rewriteQuery = async (state: ReadingChatState) => {
    const trimmedMessage = state.message.trim();
    if (!trimmedMessage) {
      return {
        rewrittenQuery: '',
      };
    }

    const needsRewrite =
      trimmedMessage.length < 20 ||
      /^(그럼|그거|이건|이거|그건|이거는|좀 더|더 자세히|quote|인용|그 책에서는)/.test(
        trimmedMessage,
      );

    if (!needsRewrite) {
      return {
        rewrittenQuery: trimmedMessage,
      };
    }

    const rewritePrompt = `
너는 독서 기록 검색을 위한 질문 재작성기다.
현재 질문과 이전 대화를 참고해서, 검색에 가장 적합한 한 문장으로 다시 써라.
사용자의 의도를 바꾸지 마라.
없는 정보나 주제를 추가하지 마라.
질문이 이미 충분히 명확하면 거의 그대로 유지하라.
검색용 질문 한 문장만 반환하라.
`;

    try {
      const response = await model.invoke([
        { role: 'system', content: rewritePrompt },
        {
          role: 'user',
          content: `
이전 대화:
${JSON.stringify(state.history, null, 2)}

현재 질문:
${state.message}
          `,
        },
      ]);

      const rewrittenQuery =
        typeof response.content === 'string'
          ? response.content.trim()
          : trimmedMessage;

      return {
        rewrittenQuery: rewrittenQuery || trimmedMessage,
      };
    } catch {
      return {
        rewrittenQuery: trimmedMessage,
      };
    }
  };

  const retrieveCards = async (state: ReadingChatState) => {
    const searchQuery = state.rewrittenQuery || state.message;

    const relevantCards = await cardEmbeddingService.searchRelevantCards(
      state.userId,
      searchQuery,
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
<role>
너는 사용자의 독서 기록을 함께 읽고 해석해주는 조수다.
</role>

<goal>
현재 질문에 대해, 제공된 카드들만 근거로 가장 자연스럽고 도움이 되는 답변을 만든다.
이 답변은 책 요약이 아니라 사용자가 남긴 독서 기록 해석이어야 한다.
</goal>

<rules>
- 반드시 제공된 카드들만 근거로 답변하라.
- 카드에 없는 사실이나 책 내용을 지어내지 마라.
- 이전 대화가 있다면 현재 질문 해석에 참고하되, 답변의 근거는 반드시 이번에 제공된 카드들만 사용하라.
- 질문을 하나의 고정된 카테고리로 억지로 분류하지 말고, 질문이 실제로 원하는 바를 읽어라.
- 질문과 직접 관련 있는 카드만 사용하라.
- 근거가 약하면 모른다고 솔직히 말하라.
- 책의 줄거리나 일반론을 길게 설명하지 마라.
- 길게 늘어놓기보다 핵심만 간결하게 정리하라.
</rules>

<reasoning_guide>
- 답변은 먼저 질문에 직접 답하고, 그 다음에 카드들에서 드러나는 공통된 관점이나 패턴을 짧게 설명하라.
- 비슷한 카드가 여러 장이면 공통된 관점이나 패턴을 묶어서 설명하라.
- 과거 생각이나 관점을 묻는다면 thought를 중심으로 요약하라.
- 인용구, 문장, 구절을 묻는다면 quote를 우선 참고하되, thought가 있으면 함께 반영하라.
- 두 책이나 여러 주제를 함께 묻는다면 카드들 사이의 공통점과 차이점을 정리하라.
- 사용자의 성향, 반복, 패턴을 묻는다면 개별 카드를 나열하기보다 반복적으로 보이는 관점을 묶어서 설명하라.
</reasoning_guide>

<style>
- 답변은 분석 보고서처럼 딱딱하게 쓰지 말고, 사용자의 기록을 함께 읽어주듯 친근하고 자연스럽게 작성하라.
- "사용자는 ~", "~가지고 있으며", "~강조하고 있습니다" 같은 리포트체 표현은 피하라.
- 대신 "~처럼 보여요", "~라는 생각이 드러나요", "~를 중요하게 보는 것 같아요"처럼 부드럽고 대화체에 가까운 한국어로 설명하라.
- 단, 지나치게 가볍거나 장난스럽지 말고 차분하게 생각을 정리해주는 톤을 유지하라.
</style>

<format>
- answer는 반드시 읽기 쉬운 마크다운 문자열로 작성하라.
- 긴 줄글 한 덩어리로만 답하지 마라.
- 기본적으로 아래 형식을 따른다.

한 줄 요약

- 핵심 포인트 1
- 핵심 포인트 2
- 필요하면 핵심 포인트 3

- 필요하면 마지막에 짧은 해석이나 연결 문장을 1줄 덧붙여라.
- 질문이 아주 단순하면 bullet 수를 줄여도 되지만, 기본적으로는 요약 1줄과 bullet 목록을 포함하라.
- 마크다운 기호는 실제 answer 문자열에 포함하라.
</format>

<output>
- sourceCardIds에는 실제 답변에 기여한 카드 id만 포함하라.
- sourceCardIds는 최대 3개까지만 반환하라.
- 반드시 아래 JSON 형식으로만 응답하라.

{
  "answer": "string",
  "sourceCardIds": [1, 2, 3]
}
</output>
`;

    const userPrompt = `
<conversation_history>
${JSON.stringify(state.history, null, 2)}
</conversation_history>

<retrieved_cards>
${JSON.stringify(state.retrievedCards, null, 2)}
</retrieved_cards>

<current_question>
${state.message}
</current_question>

<answer_reminder>
- 이전 대화가 있다면 현재 질문 해석에 참고하라.
- 답변의 근거는 반드시 이번에 제공된 관련 카드들만 사용하라.
- 관련 카드가 여러 장이면 카드별 나열보다 묶어서 설명하라.
- quote가 필요 없는 질문이면 quote를 억지로 인용하지 마라.
- thought와 quote가 함께 있으면, 사용자의 해석(thought)을 우선하고 quote는 뒷받침 근거로 써라.
- 출력 answer는 요약 1줄 뒤에 bullet 목록이 오는 마크다운 문자열이어야 한다.
</answer_reminder>`;

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
    .addNode('rewriteQuery', rewriteQuery)
    .addNode('retrieveCards', retrieveCards)
    .addNode('generateAnswer', generateAnswer)
    .addEdge('__start__', 'rewriteQuery')
    .addEdge('rewriteQuery', 'retrieveCards')
    .addEdge('retrieveCards', 'generateAnswer')
    .addEdge('generateAnswer', '__end__')
    .compile();
}
