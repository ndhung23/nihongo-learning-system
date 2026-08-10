import { AiLearningCacheModel } from "@/models/AiLearningCache";
import { CourseLearnerModel } from "@/models/CourseLearner";
import { DeckModel } from "@/models/Deck";
import { DictionaryEntryModel } from "@/models/DictionaryEntry";
import { ExampleSuggestionModel } from "@/models/ExampleSuggestion";
import { FeedbackModel } from "@/models/Feedback";
import { JlptTestModel } from "@/models/JlptTest";
import { PaymentRequestModel } from "@/models/PaymentRequest";
import { ReviewLogModel } from "@/models/ReviewLog";
import { UserModel } from "@/models/User";
import { UserVocabularyProgressModel } from "@/models/UserVocabularyProgress";
import { VocabularyModel } from "@/models/Vocabulary";

export type MasterDataResource = {
  key: string; label: string; description: string; category: "Dữ liệu cốt lõi" | "Dữ liệu học tập" | "Nội dung" | "Cộng đồng" | "Hệ thống";
  collection: string; fields: string[]; searchFields: string[]; editableFields: string[]; filterFields: string[]; canDelete: boolean;
};

export const masterDataResources: MasterDataResource[] = [
  { key: "users", label: "Người dùng", description: "Tài khoản và trạng thái", category: "Dữ liệu cốt lõi", collection: UserModel.collection.name, fields: ["username", "email", "displayName", "roles", "status", "vipUntil", "createdAt"], searchFields: ["username", "email", "displayName"], editableFields: ["displayName", "status"], filterFields: ["status"], canDelete: false },
  { key: "courses", label: "Khóa học / Bộ từ", description: "Deck và khóa học", category: "Dữ liệu cốt lõi", collection: DeckModel.collection.name, fields: ["title", "slug", "level", "sourceType", "visibility", "status", "stats", "createdAt"], searchFields: ["title", "slug", "description"], editableFields: ["title", "description", "visibility", "status"], filterFields: ["status", "visibility", "sourceType"], canDelete: false },
  { key: "vocabulary", label: "Từ vựng", description: "Kho từ vựng toàn hệ thống", category: "Nội dung", collection: VocabularyModel.collection.name, fields: ["term", "kana", "romaji", "meaningVi", "level", "lesson", "source", "isPublished", "createdAt"], searchFields: ["term", "kana", "romaji", "meaningVi"], editableFields: ["term", "kana", "romaji", "meaningVi", "isPublished"], filterFields: ["level", "source", "isPublished"], canDelete: true },
  { key: "jlpt-tests", label: "Đề thi JLPT", description: "Đề thi và số lượng câu", category: "Nội dung", collection: JlptTestModel.collection.name, fields: ["level", "number", "title", "questionCount", "source", "createdBy", "updatedAt"], searchFields: ["title", "level"], editableFields: ["title"], filterFields: ["level"], canDelete: false },
  { key: "dictionary", label: "Từ điển", description: "Mục từ điển", category: "Nội dung", collection: DictionaryEntryModel.collection.name, fields: ["term", "reading", "meanings", "source", "updatedAt"], searchFields: ["term", "reading"], editableFields: [], filterFields: ["source"], canDelete: false },
  { key: "feedback", label: "Góp ý", description: "Phản hồi người dùng", category: "Cộng đồng", collection: FeedbackModel.collection.name, fields: ["name", "email", "category", "subject", "message", "status", "createdAt"], searchFields: ["name", "email", "subject", "message"], editableFields: ["status"], filterFields: ["status", "category"], canDelete: true },
  { key: "example-suggestions", label: "Mẫu câu góp ý", description: "Đề xuất ví dụ", category: "Cộng đồng", collection: ExampleSuggestionModel.collection.name, fields: ["term", "suggestedJa", "suggestedVi", "status", "createdBy", "createdAt"], searchFields: ["term", "suggestedJa", "suggestedVi"], editableFields: ["status"], filterFields: ["status"], canDelete: true },
  { key: "payments", label: "Yêu cầu thanh toán", description: "Giao dịch cần duyệt", category: "Hệ thống", collection: PaymentRequestModel.collection.name, fields: ["userId", "kind", "amount", "status", "reviewedAt", "createdAt"], searchFields: [], editableFields: [], filterFields: ["status", "kind"], canDelete: false },
  { key: "review-logs", label: "Lịch sử ôn tập", description: "Kết quả phiên học", category: "Dữ liệu học tập", collection: ReviewLogModel.collection.name, fields: ["userId", "deckId", "vocabularyId", "mode", "score", "createdAt"], searchFields: [], editableFields: [], filterFields: ["mode"], canDelete: true },
  { key: "progress", label: "Tiến độ từ vựng", description: "Tiến độ học cá nhân", category: "Dữ liệu học tập", collection: UserVocabularyProgressModel.collection.name, fields: ["userId", "deckId", "vocabularyId", "status", "updatedAt"], searchFields: [], editableFields: [], filterFields: ["status"], canDelete: false },
  { key: "course-learners", label: "Người học khóa", description: "Quan hệ học viên và khóa", category: "Dữ liệu học tập", collection: CourseLearnerModel.collection.name, fields: ["userId", "deckId", "lastLearnedAt", "createdAt"], searchFields: [], editableFields: [], filterFields: [], canDelete: false },
  { key: "ai-cache", label: "AI Cache", description: "Bộ nhớ đệm học tập AI", category: "Hệ thống", collection: AiLearningCacheModel.collection.name, fields: ["cacheKey", "kind", "createdAt", "updatedAt"], searchFields: ["cacheKey"], editableFields: [], filterFields: ["kind"], canDelete: true },
];

export function getMasterDataResource(key: string) { return masterDataResources.find((resource) => resource.key === key); }
