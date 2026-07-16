# Nihongo Learning System - Database Design

MongoDB database: `nihongo_learning_system`

## Collections

### users
Stores authentication identity, roles, profile, VIP status, and streak metadata.

Key fields:
- `username`, `email`, `passwordHash`
- `roles`: `user`, `vip`, `creator`, `admin`
- `status`: `active`, `inactive`, `banned`, `pending_verify`
- `streak.current`, `streak.longest`, `streak.lastStudiedAt`

### decks
Stores flashcard/course vocabulary collections.

Key fields:
- `title`, `slug`, `description`
- `level`: `kana`, `n5`, `n4`, `n3`, `n2`, `n1`, `it`, `custom`
- `ownerId`
- `visibility`: `private`, `public`, `unlisted`
- `status`: `draft`, `pending_review`, `published`, `rejected`, `hidden`, `archived`
- `price.amount`, `price.currency`
- `stats.vocabularyCount`, `stats.learnerCount`, `stats.ratingAverage`

### vocabularies
Stores each vocabulary/kanji/phrase item.

Key fields:
- `deckId`
- `term`, `kana`, `romaji`, `meaningVi`, `partOfSpeech`
- `examples[]`: `{ ja, vi }`
- `distractors[]`: wrong answer options for quizzes
- `synonyms[]`, `collocations[]`, `wordFamily[]`
- `audioUrl`, `imageUrl`

### user_vocabulary_progress
Stores per-user learning state for each vocabulary item.

Key fields:
- `userId`, `vocabularyId`, `deckId`
- `status`: `new`, `learning`, `review`, `mastered`, `suspended`
- `srs.easeFactor`, `srs.intervalDays`, `srs.repetition`, `srs.dueAt`
- `stats.correctCount`, `stats.wrongCount`
- `notes`, `isBookmarked`

### review_logs
Stores every practice attempt.

Key fields:
- `userId`, `vocabularyId`, `deckId`
- `mode`: `meaning`, `flashcard`, `typing`, `dictation`, `example`
- `result`: `again`, `hard`, `good`, `easy`, `correct`, `wrong`
- `answer`, `durationMs`, `reviewedAt`

## API Routes

- `GET /api/db/health`: checks MongoDB connection.
- `GET /api/vocabulary`: lists vocabulary.
- `POST /api/vocabulary`: creates a vocabulary item.

## Environment

Create `.env.local` from `.env.example` and set:

```env
MONGODB_URI=...
MONGODB_DB=nihongo_learning_system
```
