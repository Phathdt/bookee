import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Số điện thoại hoặc email là bắt buộc'),
  password: z.string().min(8, 'Mật khẩu phải ít nhất 8 ký tự'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, 'Họ và tên là bắt buộc').max(120),
  phone: z.string().min(8, 'Số điện thoại không hợp lệ').max(20),
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải ít nhất 8 ký tự'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const renameSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được trống').max(120),
});

export type RenameFormValues = z.infer<typeof renameSchema>;
