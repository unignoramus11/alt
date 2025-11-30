"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";

interface PasswordStepProps {
  email: string;
  requestId: string;
  onVerified: (userId: string, profileCompleted: boolean) => void;
  onForgotPassword: () => void;
  onBack: () => void;
}

export default function PasswordStep({
  email,
  requestId,
  onVerified,
  onForgotPassword,
  onBack,
}: PasswordStepProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/check-user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, requestId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid credentials");
      } else {
        onVerified(data.userId, data.profileCompleted);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Send OTP for password reset
    try {
      await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, requestId, type: "login" }),
      });
      onForgotPassword();
    } catch {
      setError("Failed to send reset code");
    }
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 flex items-center"
        style={{ color: COLORS.primary }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="mb-6" style={{ color: COLORS.primary }}>
        <p className="text-sm mb-1">{email}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Password"
            className="w-full p-4 text-lg outline-none"
            style={{
              backgroundColor: COLORS.background,
              color: COLORS.primary,
              border: `2px solid ${COLORS.primary}`,
            }}
            autoFocus
          />
        </div>

        {error && (
          <p className="mb-4 text-sm" style={{ color: COLORS.primary }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!password || isLoading}
          className="w-full p-4 text-lg font-medium transition-opacity duration-200 mb-4"
          style={{
            backgroundColor: password ? COLORS.primary : COLORS.background,
            color: password ? COLORS.background : COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
            opacity: password ? 1 : 0.5,
            cursor: password ? "pointer" : "not-allowed",
          }}
        >
          {isLoading ? (
            <span
              className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: COLORS.background,
                borderTopColor: "transparent",
              }}
            />
          ) : (
            "Continue"
          )}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="w-full text-sm"
          style={{ color: COLORS.primary }}
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}
