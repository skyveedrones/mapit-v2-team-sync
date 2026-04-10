import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { getLoginUrl } from "@/const";

function formatMethod(method: string): string {
  const map: Record<string, string> = {
    google: "Google",
    microsoft: "Microsoft",
    github: "GitHub",
    apple: "Apple",
    email: "Email/Password",
  };
  return map[method.toLowerCase()] ?? method;
}

export default function AuthError() {
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason");
  const method = params.get("method") ?? "";

  const formattedMethod = formatMethod(method);

  useEffect(() => {
    if (reason === "email_conflict") {
      toast.error("Account already exists", {
        description: `An account with this email is already registered via ${formattedMethod}. Please sign in using ${formattedMethod} instead.`,
        duration: 8000,
      });
    }
  }, [reason, formattedMethod]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">Sign-in Error</CardTitle>
          <CardDescription>
            {reason === "email_conflict"
              ? `An account with this email already exists using ${formattedMethod}.`
              : "An error occurred during sign-in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {reason === "email_conflict" && (
            <p className="text-sm text-muted-foreground text-center">
              To protect your account security, please sign in using the{" "}
              <strong>{formattedMethod}</strong> option you originally used to
              register.
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
          >
            Back to Sign In
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
