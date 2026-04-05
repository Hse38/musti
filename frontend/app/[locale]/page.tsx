import { Suspense } from "react";
import { LoginHub } from "@/components/login/login-hub";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <LoginHub />
    </Suspense>
  );
}
