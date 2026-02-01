# Me API Spec

Base URL: `/me`  
Auth: required (JWT guard)

Note: current implementation uses JWT payload fields (`sub`, `id`). Ensure token
payload includes `id` or unify to `sub` across endpoints.

---

## GET /me
Get my profile.

### Response 200
```json
{
  "id": 1,
  "name": "홍길동",
  "email": "user@example.com",
  "profile": "https://..."
}
```

### Errors
- 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- 404 Not Found (user missing)
```json
{
  "statusCode": 404,
  "message": "해당 유저가 존재하지 않습니다."
}
```

---

## GET /me/library-stats
Get my library stats.

### Response 200
```json
{
  "bookCount": 12,
  "cardCount": 57
}
```

### Errors
- 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- 404 Not Found (user missing)
```json
{
  "statusCode": 404,
  "message": "해당 유저가 존재하지 않습니다."
}
```

---

## GET /me/daily-card-stack
Get cards created today (daily stack).

### Response 200
```json
{
  "items": [
    {
      "id": 1,
      "type": "insight",
      "quote": "optional",
      "thought": "text",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "book": {
        "id": 3,
        "title": "Atomic Habits"
      }
    }
  ]
}
```

### Errors
- 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- 404 Not Found (user missing)
```json
{
  "statusCode": 404,
  "message": "해당 유저가 존재하지 않습니다."
}
```

---

## GET /me/latest-book-list
Get books ordered by latest card activity (Jump Back In).

### Response 200
```json
{
  "items": [
    {
      "id": 3,
      "title": "Atomic Habits",
      "author": "James Clear",
      "publisher": "..."
    }
  ]
}
```

### Errors
- 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
- 404 Not Found (user missing)
```json
{
  "statusCode": 404,
  "message": "해당 유저가 존재하지 않습니다."
}
```
