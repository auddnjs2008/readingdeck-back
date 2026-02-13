# Deck API Spec

Base URL: `/decks`  
Auth: required (JWT guard, cookie-based)

현재 `decks/create` 페이지 기준으로, 생성 플로우에 필요한 최소 API 명세입니다.

---

## Domain Rules

- 덱 소유자만 조회/수정/발행할 수 있음
- 생성 직후 기본 상태는 `draft`
- `publish` 시 상태를 `published`로 변경
- 그래프 저장은 **스냅샷 전체 교체 방식**(`nodes[]`, `connections[]`)을 기본으로 사용
- React Flow의 임시 문자열 ID와 DB 숫자 ID 매핑을 위해 `clientKey`를 허용

---

## 1) POST /decks
초안 덱 생성

### Request Body

```json
{
  "name": "Atomic Habits Deck",
  "status": "draft",
  "nodes": [
    {
      "clientKey": "book-1",
      "type": "book",
      "bookId": 5,
      "positionX": 120,
      "positionY": 200,
      "order": 0
    },
    {
      "clientKey": "card-1",
      "type": "card",
      "cardId": 42,
      "positionX": 560,
      "positionY": 120,
      "order": 1
    }
  ],
  "connections": [
    {
      "fromNodeClientKey": "book-1",
      "toNodeClientKey": "card-1",
      "type": "smoothstep",
      "animated": false,
      "sourceHandle": null,
      "targetHandle": null,
      "label": null,
      "style": { "stroke": "var(--primary)", "strokeWidth": 2 },
      "markerEnd": null
    }
  ]
}
```

### Response 201

```json
{
  "id": 11,
  "name": "Atomic Habits Deck",
  "status": "draft",
  "createdAt": "2026-02-13T12:00:00.000Z",
  "updatedAt": "2026-02-13T12:00:00.000Z",
  "nodes": [
    {
      "id": 101,
      "clientKey": "book-1",
      "type": "book",
      "bookId": 5,
      "cardId": null,
      "positionX": 120,
      "positionY": 200,
      "order": 0
    },
    {
      "id": 102,
      "clientKey": "card-1",
      "type": "card",
      "bookId": null,
      "cardId": 42,
      "positionX": 560,
      "positionY": 120,
      "order": 1
    }
  ],
  "connections": [
    {
      "id": 9001,
      "fromNodeId": 101,
      "toNodeId": 102,
      "type": "smoothstep",
      "animated": false,
      "sourceHandle": null,
      "targetHandle": null,
      "label": null,
      "style": { "stroke": "var(--primary)", "strokeWidth": 2 },
      "markerEnd": null
    }
  ]
}
```

### Errors

- 400 Bad Request (유효성 오류)
- 401 Unauthorized
- 403 Forbidden (타 유저 book/card 참조)
- 404 Not Found (book/card 미존재)

---

## 2) PUT /decks/:deckId/graph
그래프 전체 저장(스냅샷 교체)

### Path

- `deckId` (number, required)

### Request Body

```json
{
  "nodes": [
    {
      "id": 101,
      "clientKey": "book-1",
      "type": "book",
      "bookId": 5,
      "positionX": 180,
      "positionY": 220,
      "order": 0
    },
    {
      "id": 102,
      "clientKey": "card-1",
      "type": "card",
      "cardId": 42,
      "positionX": 620,
      "positionY": 140,
      "order": 1
    }
  ],
  "connections": [
    {
      "fromNodeId": 101,
      "toNodeId": 102,
      "type": "smoothstep",
      "animated": false,
      "sourceHandle": null,
      "targetHandle": null,
      "label": null,
      "style": { "stroke": "var(--primary)", "strokeWidth": 2 },
      "markerEnd": null
    }
  ]
}
```

### Response 200

```json
{
  "id": 11,
  "status": "draft",
  "updatedAt": "2026-02-13T12:34:56.000Z",
  "nodes": [
    {
      "id": 101,
      "clientKey": "book-1",
      "type": "book",
      "bookId": 5,
      "cardId": null,
      "positionX": 180,
      "positionY": 220,
      "order": 0
    },
    {
      "id": 102,
      "clientKey": "card-1",
      "type": "card",
      "bookId": null,
      "cardId": 42,
      "positionX": 620,
      "positionY": 140,
      "order": 1
    }
  ],
  "connections": [
    {
      "id": 9001,
      "fromNodeId": 101,
      "toNodeId": 102,
      "type": "smoothstep",
      "animated": false,
      "sourceHandle": null,
      "targetHandle": null,
      "label": null,
      "style": { "stroke": "var(--primary)", "strokeWidth": 2 },
      "markerEnd": null
    }
  ]
}
```

### Errors

- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden (덱 소유자 아님 / 타 유저 자산 참조)
- 404 Not Found (deck/node 없음)

---

## 3) POST /decks/:deckId/publish
덱 발행

### Path

- `deckId` (number, required)

### Request Body (optional)

```json
{
  "name": "Atomic Habits Deck v1"
}
```

### Response 200

```json
{
  "id": 11,
  "name": "Atomic Habits Deck v1",
  "status": "published",
  "updatedAt": "2026-02-13T13:00:00.000Z"
}
```

### Errors

- 400 Bad Request (노드 0개 등 발행 조건 실패 시)
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

---

## 4) GET /decks/:deckId
덱 상세(에디터 복원용)

### Path

- `deckId` (number, required)

### Response 200

```json
{
  "id": 11,
  "name": "Atomic Habits Deck v1",
  "status": "draft",
  "createdAt": "2026-02-13T12:00:00.000Z",
  "updatedAt": "2026-02-13T12:34:56.000Z",
  "nodes": [
    {
      "id": 101,
      "clientKey": "book-1",
      "type": "book",
      "bookId": 5,
      "cardId": null,
      "positionX": 180,
      "positionY": 220,
      "order": 0
    },
    {
      "id": 102,
      "clientKey": "card-1",
      "type": "card",
      "bookId": null,
      "cardId": 42,
      "positionX": 620,
      "positionY": 140,
      "order": 1
    }
  ],
  "connections": [
    {
      "id": 9001,
      "fromNodeId": 101,
      "toNodeId": 102,
      "type": "smoothstep",
      "animated": false,
      "sourceHandle": null,
      "targetHandle": null,
      "label": null,
      "style": { "stroke": "var(--primary)", "strokeWidth": 2 },
      "markerEnd": null
    }
  ]
}
```

### Errors

- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

---

## DTO Draft (NestJS)

```ts
// enums
export enum DeckStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

export enum DeckNodeType {
  BOOK = "book",
  CARD = "card",
}
```

```ts
export class DeckGraphNodeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @IsString()
  clientKey?: string; // react-flow client id

  @IsEnum(DeckNodeType)
  type: DeckNodeType;

  @ValidateIf((o) => o.type === DeckNodeType.BOOK)
  @IsInt()
  @Min(1)
  bookId?: number;

  @ValidateIf((o) => o.type === DeckNodeType.CARD)
  @IsInt()
  @Min(1)
  cardId?: number;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
```

```ts
export class DeckGraphConnectionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  fromNodeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  toNodeId?: number;

  @IsOptional()
  @IsString()
  fromNodeClientKey?: string;

  @IsOptional()
  @IsString()
  toNodeClientKey?: string;

  @IsOptional()
  @IsString()
  type?: string | null;

  @IsOptional()
  @IsBoolean()
  animated?: boolean;

  @IsOptional()
  @IsString()
  sourceHandle?: string | null;

  @IsOptional()
  @IsString()
  targetHandle?: string | null;

  @IsOptional()
  @IsString()
  label?: string | null;

  @IsOptional()
  style?: { stroke?: string; strokeWidth?: number } | null;

  @IsOptional()
  markerEnd?: { type?: string } | null;
}
```

```ts
export class CreateDeckDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsEnum(DeckStatus)
  status?: DeckStatus;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckGraphNodeDto)
  nodes?: DeckGraphNodeDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckGraphConnectionDto)
  connections?: DeckGraphConnectionDto[];
}

export class UpdateDeckGraphDto {
  @ValidateNested({ each: true })
  @Type(() => DeckGraphNodeDto)
  nodes: DeckGraphNodeDto[];

  @ValidateNested({ each: true })
  @Type(() => DeckGraphConnectionDto)
  connections: DeckGraphConnectionDto[];
}

export class PublishDeckDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;
}
```

---

## Recommended FE Mapping (`decks/create`)

- `Create Deck` 버튼:  
  `POST /decks` (없으면 생성) -> `POST /decks/:id/publish`
- `Save` 버튼:  
  `PUT /decks/:id/graph`
- 에디터 재진입:  
  `GET /decks/:id`
