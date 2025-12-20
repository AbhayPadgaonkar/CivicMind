"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signupUser } from "@/lib/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    const form = e.currentTarget;
    const firstName = form.firstName.value;
    const lastName = form.lastName.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirm = form["confirm-password"].value;

    if (password !== confirm) {
      alert("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await signupUser(
        firstName,
        lastName,
        email,
        password
      );
      router.push("/dashboard/resultpage");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-lg mx-auto", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your details to get started
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input id="firstName" required disabled={loading} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input id="lastName" required disabled={loading} />
                </Field>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={loading}
                />
              </Field>

              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      required
                      disabled={loading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      disabled={loading}
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Minimum 8 characters.
                </FieldDescription>
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      Creating account…
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link href="./login" className="underline">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our{" "}
        <a href="#" className="underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="#" className="underline">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  );
}
