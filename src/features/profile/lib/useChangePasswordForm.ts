import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { ChangePasswordRequest } from '@/features/profile/api/passwordApi';
import { changePasswordFieldErrors } from '@/features/profile/lib/changePasswordErrors';
import {
  changePasswordMismatchMessage,
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/features/profile/schemas';

type ChangePasswordMutation = {
  isPending: boolean;
  mutate: (
    values: ChangePasswordRequest,
    options: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
};

export function useChangePasswordForm(mutation: ChangePasswordMutation) {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
  });
  const [succeeded, setSucceeded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const clearFieldError = (name: keyof ChangePasswordFormValues) => {
    setSucceeded(false);
    setSaveError(null);
    form.clearErrors(name);
  };

  const save = () => {
    void form.handleSubmit((values) => {
      setSucceeded(false);
      setSaveError(null);
      form.clearErrors();
      mutation.mutate(
        {
          current_password: values.currentPassword,
          new_password: values.newPassword,
          new_password_confirm: values.newPasswordConfirm,
        },
        {
          onSuccess: () => {
            form.reset();
            setSucceeded(true);
          },
          onError: (error) => {
            const fieldErrors = changePasswordFieldErrors(error);
            let handled = false;
            if (fieldErrors?.current_password) {
              form.setError('currentPassword', { message: "That's not right. Try again." });
              handled = true;
            }
            if (fieldErrors?.new_password_confirm) {
              form.setError('newPasswordConfirm', { message: changePasswordMismatchMessage });
              handled = true;
            }
            const rulesMessage = fieldErrors?.non_field_errors?.join(' ');
            if (rulesMessage) {
              form.setError('newPassword', { message: rulesMessage });
              handled = true;
            }
            if (!handled) setSaveError("Couldn't change your password. Try again.");
          },
        },
      );
    })();
  };

  return {
    control: form.control,
    errors: form.formState.errors,
    isSaving: mutation.isPending,
    saveError,
    succeeded,
    save,
    clearFieldError,
  };
}

export type ChangePasswordForm = ReturnType<typeof useChangePasswordForm>;
