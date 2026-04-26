import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
