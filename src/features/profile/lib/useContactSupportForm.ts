import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { SendSupportMessageValues } from '@/features/profile/api/contactSupportApi';
import { contactSupportSchema, type ContactSupportFormValues } from '@/features/profile/schemas';

type ContactSupportMutation = {
  isPending: boolean;
  mutate: (
    values: SendSupportMessageValues,
    options: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
};

export function useContactSupportForm(mutation: ContactSupportMutation) {
  const form = useForm<ContactSupportFormValues>({
    resolver: zodResolver(contactSupportSchema),
    defaultValues: { subject: '', message: '' },
  });
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle');

  const clearFieldError = (name: keyof ContactSupportFormValues) => {
    setStatus('idle');
    form.clearErrors(name);
  };

  const send = () => {
    void form.handleSubmit((values) => {
      setStatus('idle');
      form.clearErrors();
      mutation.mutate(values, {
        onSuccess: () => {
          form.reset();
          setStatus('sent');
        },
        onError: () => setStatus('failed'),
      });
    })();
  };

  return {
    control: form.control,
    errors: form.formState.errors,
    isSending: mutation.isPending,
    status,
    send,
    clearFieldError,
  };
}

export type ContactSupportForm = ReturnType<typeof useContactSupportForm>;
