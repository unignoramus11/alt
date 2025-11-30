"use client";

import { useState, useRef, useEffect } from "react";
import { COLORS, OTP } from "@/lib/constants";

interface OTPStepProps {
  email: string;
  requestId: string;
  onVerified: (
    userId: string,
    isNewUser: boolean,
    profileCompleted: boolean
  ) => void;
  onBack: () => void;
}

export default function OTPStep({
  email,
  requestId,
  onVerified,
  onBack,
}: OTPStepProps) {
  const [otp, setOtp] = useState<string[]>(new Array(OTP.length).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < OTP.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    if (
      newOtp.every((digit) => digit !== "") &&
      newOtp.join("").length === OTP.length
    ) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP.length);
    if (pasted.length === OTP.length) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (otpValue: string) => {
    if (otpValue.length !== OTP.length || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue, type: "login" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        setOtp(new Array(OTP.length).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        onVerified(data.userId, data.isNewUser, data.profileCompleted);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, requestId, type: "login" }),
      });
      setResendCooldown(60);
    } catch {
      setError("Failed to resend code");
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

      <div className="flex gap-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-medium outline-none"
            style={{
              backgroundColor: COLORS.background,
              color: COLORS.primary,
              border: `2px solid ${COLORS.primary}`,
            }}
            disabled={isLoading}
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 text-sm" style={{ color: COLORS.primary }}>
          {error}
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center mb-4">
          <span
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: COLORS.primary,
              borderTopColor: "transparent",
            }}
          />
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={resendCooldown > 0}
        className="w-full text-sm"
        style={{
          color: COLORS.primary,
          opacity: resendCooldown > 0 ? 0.5 : 1,
          cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
        }}
      >
        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
      </button>
    </div>
  );
}
