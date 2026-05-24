import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const answerSubmitSchema = z.object({
  questionId: z.string().uuid(),
  responseText: z.string().min(1, "Answer cannot be empty").max(5000),
});

export const chatSendSchema = z.object({
  lessonId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});
