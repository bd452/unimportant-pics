import {z} from 'zod';

export const aiSignalSchema = z.enum([
  'blurry',
  'duplicate_like',
  'screenshot',
  'receipt',
  'low_light',
  'document',
  'pet',
  'person',
  'scenic',
  'memory_worthy',
  'pocket_shot',
  'text_heavy',
]);

export const aiResultSchema = z.object({
  status: z.enum(['green', 'yellow', 'red']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(280),
  signals: z.array(aiSignalSchema).max(8),
  reviewPriority: z.number().min(0).max(1),
});

export type AIResult = z.infer<typeof aiResultSchema>;

export const requestItemSchema = z.object({
  id: z.string().min(1).max(512),
  imageBase64: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  createdAt: z.number().optional(),
});

export const requestBodySchema = z.object({
  items: z.array(requestItemSchema).min(1).max(8),
});

export const responseItemSchema = z.object({
  id: z.string(),
  result: aiResultSchema.optional(),
  error: z.string().optional(),
});

export type RequestItem = z.infer<typeof requestItemSchema>;
export type ResponseItem = z.infer<typeof responseItemSchema>;
