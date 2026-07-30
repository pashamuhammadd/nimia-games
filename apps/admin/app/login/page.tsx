import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign In" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectedFrom?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm
        initialError={error === "not_admin" ? "This account doesn't have admin access." : undefined}
      />
    </div>
  );
}
