import dynamic from "next/dynamic";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

const LoginForm = dynamic(() => import("./LoginForm"), {
  loading: () => <AuthFormSkeleton />,
});

export default function LoginPage() {
  return <LoginForm />;
}
