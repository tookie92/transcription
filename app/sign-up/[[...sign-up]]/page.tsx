import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="grid min-h-dvh h-screen lg:grid-cols-2 w-full overflow-y-hidden bg-background">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignUp />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block border-l border-border">
        <img
          src="/Welcome.jpg"
          alt="Researcher at a field table with interview notes"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.35]"
        />
      </div>
    </div>
  );
}
