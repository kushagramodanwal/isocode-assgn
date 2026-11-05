import { z } from 'zod';

// Roles
export const UserRoleSchema = z.enum(['retailer', 'desk']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Order States as per Spec 4.6
export const OrderStatusSchema = z.enum([
  'payment_pending',
  'payment_failed',
  'pending_desk',
  'on_hold',
  'approved',
  'exported',
  'rejected',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentModeSchema = z.enum(['credit_account', 'online_mock']);
export type PaymentMode = z.infer<typeof PaymentModeSchema>;

export const PaymentStatusSchema = z.enum(['not_required', 'pending', 'succeeded', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const RefundStatusSchema = z.enum(['none', 'required_mock', 'processed_mock']);
export type RefundStatus = z.infer<typeof RefundStatusSchema>;

// Auth
export const OtpRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number too long'),
});
export type OtpRequest = z.infer<typeof OtpRequestSchema>;

export const OtpVerifySchema = z.object({
  phone: z.string().trim().min(10),
  code: z.string().trim().min(4).max(8),
});
export type OtpVerify = z.infer<typeof OtpVerifySchema>;

// Cart Preview
export const CartPreviewLineSchema = z.object({
  skuCode: z.string().min(1),
  cases: z.number().int().min(0).max(10000),
});

export const CartPreviewRequestSchema = z.object({
  lines: z.array(CartPreviewLineSchema).min(1, 'Cart cannot be empty'),
});
export type CartPreviewRequest = z.infer<typeof CartPreviewRequestSchema>;

// Order Placement
export const OrderPlacementLineSchema = z.object({
  skuCode: z.string().min(1),
  cases: z.number().int().positive('Cases must be greater than zero').max(10000),
});

export const OrderPlacementSchema = z.object({
  lines: z.array(OrderPlacementLineSchema).min(1, 'Order must contain at least one line'),
  paymentMode: PaymentModeSchema,
  demoPaymentOutcome: z.enum(['succeeds', 'fails']).optional(),
  aiDraftId: z.string().uuid().optional(),
});
export type OrderPlacement = z.infer<typeof OrderPlacementSchema>;

// AI Order Drafts
export const AiDraftCreateSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
});
export type AiDraftCreate = z.infer<typeof AiDraftCreateSchema>;

export const AiDraftConfirmLineSchema = z.object({
  skuCode: z.string().min(1),
  cases: z.number().int().positive(),
});

export const AiDraftConfirmSchema = z.object({
  lines: z.array(AiDraftConfirmLineSchema).min(1),
  paymentMode: PaymentModeSchema,
  demoPaymentOutcome: z.enum(['succeeds', 'fails']).optional(),
});
export type AiDraftConfirm = z.infer<typeof AiDraftConfirmSchema>;

// Desk
export const DeskLineUpdateSchema = z.object({
  skuId: z.string().uuid().optional(),
  skuCode: z.string().optional(),
  billedCases: z.number().int().min(0).max(10000),
  createAlias: z.boolean().default(false),
  aliasPhrase: z.string().trim().optional(),
});
export type DeskLineUpdate = z.infer<typeof DeskLineUpdateSchema>;

export const DeskExportRequestSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, 'Select at least one order to export'),
});
export type DeskExportRequest = z.infer<typeof DeskExportRequestSchema>;
