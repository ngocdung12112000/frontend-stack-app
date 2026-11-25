import { z } from "zod";

/**
 * Shared by the client forms and the Server Actions (F01 BR-01, BR-02).
 * Password: 8-128 chars, at least one letter and one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(256, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const loginSchema = z.object({
  email: emailSchema,
  // No policy check on login: never reveal the rules to someone guessing.
  password: z.string().min(1, "Password is required").max(128, "Password is too long"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1, "Reset link is invalid"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const confirmEmailSchema = z.object({
  userId: z.uuid("Confirmation link is invalid"),
  token: z.string().min(1, "Confirmation link is invalid"),
});
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;

export const revokeSessionSchema = z.object({ familyId: z.uuid() });
