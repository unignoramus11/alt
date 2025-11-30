"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COLORS, BRANCHES, BATCHES } from "@/lib/constants";

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  rollNumber?: string;
  batch?: string;
  branch?: string;
  hasPasswordAuth: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [branch, setBranch] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setUsername(data.username || "");
      setRollNumber(data.rollNumber || "");
      setBatch(data.batch || "");
      setBranch(data.branch || "");
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          rollNumber: rollNumber.trim() || undefined,
          batch: batch || undefined,
          branch: branch || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile");
      } else {
        setSuccess("Profile updated");
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.background }}
      >
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: COLORS.primary,
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: COLORS.background,
    color: COLORS.primary,
    border: `2px solid ${COLORS.primary}`,
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.background }}
    >
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: COLORS.background,
          border: `2px solid ${COLORS.primary}`,
        }}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h1
              className="text-xl font-medium"
              style={{ color: COLORS.primary }}
            >
              Profile
            </h1>
            <button
              onClick={handleLogout}
              className="text-sm underline"
              style={{ color: COLORS.primary }}
            >
              Logout
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-4 text-lg outline-none"
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full p-4 text-lg outline-none opacity-60"
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="Roll Number (optional)"
                className="w-full p-4 text-lg outline-none"
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full p-4 text-lg outline-none appearance-none cursor-pointer"
                style={inputStyle}
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
                style={inputStyle}
              >
                <option value="">Branch (optional)</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="mb-6 pt-6"
              style={{ borderTop: `1px solid ${COLORS.primary}` }}
            >
              <p className="text-sm mb-4" style={{ color: COLORS.primary }}>
                {profile?.hasPasswordAuth
                  ? "Change password"
                  : "Set a password (optional)"}
              </p>

              <div className="mb-4">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full p-4 text-lg outline-none"
                  style={inputStyle}
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full p-4 text-lg outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm" style={{ color: COLORS.primary }}>
                {error}
              </p>
            )}

            {success && (
              <p className="mb-4 text-sm" style={{ color: COLORS.primary }}>
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full p-4 text-lg font-medium transition-opacity duration-200"
              style={{
                backgroundColor: COLORS.primary,
                color: COLORS.background,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <span
                  className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: COLORS.background,
                    borderTopColor: "transparent",
                  }}
                />
              ) : (
                "Save"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
