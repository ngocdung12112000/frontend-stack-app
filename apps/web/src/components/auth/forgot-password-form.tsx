"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@stackshop/ui";
import { forgotPasswordAction } from "@/app/(auth)/forgot-password/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { applyFailure, FormAlert } from "./form-utils";

/** BR-07: the same confirmation is shown whether or not the address has an account. */
export const FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we have sent a link to reset your password.";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.ok) setSent(true);
      else setFormError(applyFailure(form, result));
    });
  });

  if (sent) {
    return (
      <div className="grid gap-4">
        <Alert variant="success">
          <MailCheck aria-hidden="true" />
          <AlertDescription>{FORGOT_PASSWORD_MESSAGE}</AlertDescription>
        </Alert>
        <Link href="/login" className="text-center text-sm font-medium underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormAlert message={formError} />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Sending..." : "Send reset link"}
        </Button>
        <Link href="/login" className="text-center text-sm text-muted-foreground underline">
          Back to log in
        </Link>
      </form>
    </Form>
  );
}
