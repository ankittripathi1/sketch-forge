import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/login";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
