"use client";

import { useState, useEffect } from "react";
import { COLORS, EMAIL_REGEX } from "@/lib/constants";

interface EmailStepProps {
  requestId: string;
  onSubmit: (
    email: string,
    userInfo: {
      isNewUser: boolean;
      hasPasswordAuth: boolean;
      profileCompleted: boolean;
    }
  ) => void;
}

export default function EmailStep({ requestId, onSubmit }: EmailStepProps) {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsValid(EMAIL_REGEX.test(email));
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);

    try {
      // Check if user exists
      const checkRes = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();

      // If new user or no password auth, send OTP
      if (checkData.isNewUser || !checkData.hasPasswordAuth) {
        await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, requestId, type: "login" }),
        });
      }

      onSubmit(email, {
        isNewUser: checkData.isNewUser,
        hasPasswordAuth: checkData.hasPasswordAuth,
        profileCompleted: checkData.profileCompleted,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-4 text-lg outline-none"
          style={{
            backgroundColor: COLORS.background,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
          }}
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full p-4 text-lg font-medium transition-opacity duration-200"
        style={{
          backgroundColor: isValid ? COLORS.primary : COLORS.background,
          color: isValid ? COLORS.background : COLORS.primary,
          border: `2px solid ${COLORS.primary}`,
          opacity: isValid ? 1 : 0.5,
          cursor: isValid ? "pointer" : "not-allowed",
        }}
      >
        {isLoading ? (
          <span
            className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
            style={{
              borderColor: isValid ? COLORS.background : COLORS.primary,
              borderTopColor: "transparent",
            }}
          />
        ) : (
          "Continue"
        )}
      </button>
    </form>
  );
}
