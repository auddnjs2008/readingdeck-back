# Card API 명세

## Base Path
`/cards`

## 인증
모든 API는 인증이 필요합니다. `Authorization` 헤더에 Bearer 토큰을 포함해야 합니다.

---

## 1. 오늘 생성한 카드 목록 조회

오늘 생성된 카드 목록을 조회합니다.

| 항목 | 내용 |
|------|------|
| Method | `GET` |
| Path | `/cards/today` |
| 인증 | 필요 |

### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| limit | number | X | 3 | 조회할 카드 개수 (최소 1) |

### Request Example

```
GET /cards/today?limit=5
Authorization: Bearer <access_token>
```

### Response (200 OK)

```json
[
  {
    "id": 1,
    "type": "insight",
    "quote": "인용문 내용",
    "thought": "생각 내용",
    "backgroundImage": null,
    "createdAt": "2025-01-23T10:00:00.000Z",
    "updatedAt": "2025-01-23T10:00:00.000Z",
    "version": 1,
    "book": {
      "id": 5,
      "title": "책 제목",
      "author": "저자",
      "contents": null,
      "publisher": "출판사",
      "backgroundImage": null,
      "createdAt": "2025-01-20T00:00:00.000Z",
      "updatedAt": "2025-01-20T00:00:00.000Z",
      "version": 1
    }
  }
]
```

### Response Fields

| 필드 | 타입 | 설명 |
|------|------|------|
| id | number | 카드 ID |
| type | string | 카드 타입 (`insight`, `change`, `action`, `question`) |
| quote | string \| null | 인용문 |
| thought | string | 생각 내용 |
| backgroundImage | string \| null | 배경 이미지 URL |
| createdAt | string (ISO 8601) | 생성일시 |
| updatedAt | string (ISO 8601) | 수정일시 |
| version | number | 버전 |
| book | object | 연결된 책 정보 |

### 비즈니스 로직

- `createdAt`이 당일 00:00:00 ~ 23:59:59 사이인 카드만 조회
- 해당 사용자의 책(`book.userId`)에 속한 카드만 조회
- `createdAt` 기준 내림차순 정렬 (최신순)
- `limit`으로 조회 개수 제한
