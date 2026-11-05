import { z } from 'zod';

/** Mirrors PATCH /users/me/memory-facts/{fact_id}/ after the backend trims the value. */
export const memoryFactCorrectionSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export type MemoryFactCorrectionValues = z.infer<typeof memoryFactCorrectionSchema>;

export const accountNameSchema = z.object({
  first_name: z.string().trim().min(1, "Your name can't be empty."),
  last_name: z.string().trim(),
});

export type AccountNameFormValues = z.infer<typeof accountNameSchema>;

export const changePasswordMismatchMessage = "These don't match.";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'At least 8 characters. Try again.'),
    newPasswordConfirm: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    message: changePasswordMismatchMessage,
    path: ['newPasswordConfirm'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
