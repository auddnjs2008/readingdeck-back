# Book API Spec

Base URL: `/books`  
Auth: required (JWT guard)

---

## GET /books
List books with pagination, search, and sorting.

### Query
- `page` (number, optional, default `1`)
- `take` (number, optional, default `10`)
- `keyword` (string, optional) — title/author search
- `sort` (enum, optional)
  - `createdAt`
  - `recentCard`
  - `mostCards`

### Response 200
```json
{
  "items": [
    {
      "id": 1,
      "title": "Atomic Habits",
      "author": "James Clear",
      "publisher": "..."
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "take": 10,
    "totalPages": 2
  }
}
```

### Errors
- 401 Unauthorized

---

## GET /books/:bookId
Get book detail.

> Note: controller currently uses `@Get('bookId')`. Intended path is
`/books/:bookId`. If you see `GET /books/bookId` only, fix the controller.

### Response 200
```json
{
  "id": 1,
  "title": "Atomic Habits",
  "author": "James Clear",
  "publisher": "...",
  "backgroundImage": "https://..."
}
```

### Errors
- 401 Unauthorized
- 404 Not Found

---

## GET /books/:bookId/cards
Get cards for a book (cursor-based).

### Query
- `take` (number, optional, default `10`)
- `cursor` (number, optional) — card id cursor
- `types` (array, optional) — `insight | change | action | question`
- `hasQuote` (boolean, optional)
- `sort` (enum, optional) — `latest | oldest`

### Response 200
```json
{
  "items": [
    {
      "id": 10,
      "type": "insight",
      "quote": "optional",
      "thought": "text"
    }
  ],
  "nextCursor": 10,
  "hasNext": true
}
```

### Errors
- 401 Unauthorized
- 403 Forbidden (not owner)
- 404 Not Found (book not found)

---

## POST /books/:bookId/cards
Create a card for a book.

### Path
- `bookId` (number, required) — book id

### Request
`application/json`
- `type` (enum, required) — `insight` | `change` | `action` | `question`
- `thought` (string, required)
- `quote` (string, optional)
- `pageStart` (number, optional)
- `pageEnd` (number, optional)

### Request Example
```json
{
  "type": "insight",
  "thought": "습관은 작은 행동의 반복이다.",
  "quote": "You do not rise to the level of your goals...",
  "pageStart": 42,
  "pageEnd": 43
}
```

### Response 201
```json
{
  "id": 1,
  "type": "insight",
  "quote": "You do not rise to the level of your goals...",
  "thought": "습관은 작은 행동의 반복이다.",
  "backgroundImage": null,
  "createdAt": "2025-01-23T10:00:00.000Z",
  "updatedAt": "2025-01-23T10:00:00.000Z",
  "version": 1,
  "pageStart": 42,
  "pageEnd": 43,
  "book": {
    "id": 5,
    "title": "Atomic Habits",
    "author": "James Clear",
    "publisher": "..."
  }
}
```

### Errors
- 401 Unauthorized
- 403 Forbidden (not owner of the book)
- 404 Not Found (user or book not found)

---

## GET /books/search
Search books via Kakao Book Search API.

### Query
- `query` (string, required) — search keyword
- `sort` (enum, optional) — `accuracy | latest` (default: `accuracy`)
- `page` (number, optional) — 1~50 (default: `1`)
- `size` (number, optional) — 1~50 (default: `10`)
- `target` (enum, optional) — `title | isbn | publisher | person`

### Response 200
```json
{
  "documents": [
    {
      "title": "Atomic Habits",
      "authors": ["James Clear"],
      "publisher": "...",
      "isbn": "...",
      "thumbnail": "https://..."
    }
  ],
  "meta": {
    "pageable_count": 1000,
    "total_count": 1000,
    "is_end": false
  }
}
```

### Response Type (frontend)
```ts
export interface KakaoBookSearchResponse {
  meta: {
    is_end: boolean;
    pageable_count: number;
    total_count: number;
  };
  documents: KakaoBookDocument[];
}

export interface KakaoBookDocument {
  authors: string[];
  contents: string;
  datetime: string;
  isbn: string;
  price: number;
  publisher: string;
  sale_price: number;
  status: string;
  thumbnail: string;
  title: string;
  translators: string[];
  url: string;
}
```

### Errors
- 401 Unauthorized

---

## POST /books
Create a book. Supports optional cover upload.

### Request
`multipart/form-data`
- `title` (string, required)
- `author` (string, required)
- `publisher` (string, required)
- `backgroundImage` (file, optional)

### Response 200
```json
{
  "id": 1,
  "title": "Atomic Habits",
  "author": "James Clear",
  "publisher": "...",
  "backgroundImage": "https://..."
}
```

### Errors
- 401 Unauthorized
- 404 Not Found (user missing)
