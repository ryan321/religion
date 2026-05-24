export type AnswerStatus = "pending" | "partial" | "passed";
export type LessonKind = "lesson" | "test";
export type ChatRole = "user" | "assistant";

export interface GradeResult {
  status: AnswerStatus;
  feedback: string;
}
