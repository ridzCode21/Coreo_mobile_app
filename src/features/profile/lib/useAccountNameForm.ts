import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { UpdateProfileValues } from '@/features/auth';
import { accountNameSchema, type AccountNameFormValues } from '@/features/profile/schemas';

type AccountNameUser = Pick<UpdateProfileValues, 'first_name' | 'last_name'>;
type PendingDiscardFor = 'cancel' | 'back' | null;

type UpdateNameMutation = {
  isPending: boolean;
  mutate: (
    values: UpdateProfileValues,
    options: { onSuccess: () => void; onError: () => void },
  ) => void;
};

type UseAccountNameFormArgs = {
  user: AccountNameUser;
  mutation: UpdateNameMutation;
  onDiscardBack: () => void;
};

export function useAccountNameForm({ user, mutation, onDiscardBack }: UseAccountNameFormArgs) {
  const form = useForm<AccountNameFormValues>({
    resolver: zodResolver(accountNameSchema),
    defaultValues: user,
  });
  const [mode, setMode] = useState<'display' | 'editing' | 'discarding'>('display');
  const [pendingDiscardFor, setPendingDiscardFor] = useState<PendingDiscardFor>(null);
  const [didSave, setDidSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = () => {
    setDidSave(false);
    setSaveError(null);
    form.reset(user);
    setMode('editing');
  };

  const requestDiscard = (forAction: Exclude<PendingDiscardFor, null>) => {
    const parsed = accountNameSchema.safeParse(form.getValues());
    const isDirty =
      !parsed.success ||
      parsed.data.first_name !== user.first_name ||
      parsed.data.last_name !== user.last_name;
    if (!isDirty) {
      form.reset(user);
      setMode('display');
      if (forAction === 'back') onDiscardBack();
      return;
    }
    setPendingDiscardFor(forAction);
    setMode('discarding');
  };

  const keepEditing = () => {
    setPendingDiscardFor(null);
    setMode('editing');
  };

  const confirmDiscard = () => {
    const shouldNavigateBack = pendingDiscardFor === 'back';
    form.reset(user);
    setPendingDiscardFor(null);
    setMode('display');
    if (shouldNavigateBack) onDiscardBack();
  };

  const save = () => {
    void form.handleSubmit((values) => {
      setSaveError(null);
      mutation.mutate(values, {
        onSuccess: () => {
          form.reset(values);
          setDidSave(true);
          setMode('display');
        },
        onError: () => setSaveError("Couldn't save your name. Try again."),
      });
    })();
  };

  return {
    control: form.control,
    errors: form.formState.errors,
    mode,
    didSave,
    saveError,
    isSaving: mutation.isPending,
    startEdit,
    requestCancel: () => requestDiscard('cancel'),
    requestLeave: () => requestDiscard('back'),
    keepEditing,
    confirmDiscard,
    save,
    clearSaveError: () => setSaveError(null),
  };
}

export type AccountNameForm = ReturnType<typeof useAccountNameForm>;
