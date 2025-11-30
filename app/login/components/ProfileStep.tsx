"use client";

import { useState } from "react";
import { COLORS, BRANCHES, BATCHES } from "@/lib/constants";

interface ProfileStepProps {
  userId: string;
  email: string;
  onComplete: () => void;
}

export default function ProfileStep({
  userId,
  email,
  onComplete,
}: ProfileStepProps) {
  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    username.trim().length > 0 &&
    (password.length === 0 ||
      (password.length >= 6 && password === confirmPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username: username.trim(),
          rollNumber: rollNumber.trim() || undefined,
          batch: batch || undefined,
          branch: branch || undefined,
          password: password || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save profile");
      } else {
        onComplete();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const selectStyles = {
    backgroundColor: COLORS.background,
    color: COLORS.primary,
    border: `2px solid ${COLORS.primary}`,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          placeholder="What should we call you?"
          className="w-full p-4 text-lg outline-none"
          style={{
            backgroundColor: COLORS.background,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
          }}
          autoFocus
        />
      </div>

      <div className="mb-4">
        <input
          type="email"
          value={email}
          disabled
          className="w-full p-4 text-lg outline-none opacity-60"
          style={{
            backgroundColor: COLORS.background,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
          }}
        />
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
          placeholder="Roll Number (optional)"
          className="w-full p-4 text-lg outline-none"
          style={{
            backgroundColor: COLORS.background,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
          }}
        />
      </div>

      <div className="mb-4">
        <select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="w-full p-4 text-lg outline-none appearance-none cursor-pointer"
          style={selectStyles}
        >
          <option value="">Batch (optional)</option>
          {BATCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full p-4 text-lg outline-none appearance-none cursor-pointer"
          style={selectStyles}
        >
          <option value="">Branch (optional)</option>
          {BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Set a password (optional)"
          className="w-full p-4 text-lg outline-none"
          style={{
            backgroundColor: COLORS.background,
            color: COLORS.primary,
            border: `2px solid ${COLORS.primary}`,
          }}
        />
      </div>

      {password && (
        <div className="mb-6">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError("");
            }}
            placeholder="Confirm password"
            className="w-full p-4 text-lg outline-none"
            style={{
              backgroundColor: COLORS.background,
              color: COLORS.primary,
              border: `2px solid ${COLORS.primary}`,
            }}
          />
          {password.length > 0 && password.length < 6 && (
            <p className="mt-2 text-sm" style={{ color: COLORS.primary }}>
              Password must be at least 6 characters
            </p>
          )}
          {password.length >= 6 &&
            confirmPassword &&
            password !== confirmPassword && (
              <p className="mt-2 text-sm" style={{ color: COLORS.primary }}>
                Passwords do not match
              </p>
            )}
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm" style={{ color: COLORS.primary }}>
          {error}
        </p>
      )}

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
          "Finish"
        )}
      </button>
    </form>
  );
}
