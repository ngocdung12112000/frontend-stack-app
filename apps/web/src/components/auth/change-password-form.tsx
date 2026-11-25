"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
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
import { changePasswordAction } from "@/app/account/security/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/schemas/auth";
import { applyFailure, FormAlert } from "./form-utils";

export function ChangePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setDone(false);
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (result.ok) {
        form.reset();
        setDone(true);
        return;
      }
      setFormError(applyFailure(form, result, { returnPath: "/account/security" }));
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="grid max-w-md gap-4">
        <FormAlert message={formError} />
        {done && (
          <Alert variant="success" role="status">
            <CheckCircle2 aria-hidden="true" />
            <AlertDescription>Your password has been changed.</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit" disabled={pending} aria-busy={pending} className="w-fit">
          {pending ? "Saving..." : "Change password"}
        </Button>
      </form>
    </Form>
  );
}
