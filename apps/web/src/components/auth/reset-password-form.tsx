"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@stackshop/ui";
import { resetPasswordAction } from "@/app/(auth)/reset-password/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { applyFailure, FormAlert } from "./form-utils";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, token, newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (result.ok) {
        router.push("/login?reset=1");
        return;
      }
      setFormError(applyFailure(form, result));
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormAlert message={formError} />
        <p className="text-sm text-muted-foreground">
          Resetting the password for <span className="font-medium text-foreground">{email}</span>
        </p>
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>
                At least 8 characters, with a letter and a number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving..." : "Set new password"}
        </Button>
        <Link href="/forgot-password" className="text-center text-sm text-muted-foreground underline">
          Request a new link
        </Link>
      </form>
    </Form>
  );
}
