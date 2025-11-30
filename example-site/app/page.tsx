"use client";

import { ALT_AUTH_URL } from "@/lib/config";

export default function Home() {
  const handleLogin = () => {
    // Set auth state cookie before redirecting
    const nonce = crypto.randomUUID();
    const redirectUrl = "/dashboard";

    document.cookie = `alt_auth_state=${JSON.stringify({
      nonce,
      redirectUrl,
    })}; path=/; SameSite=Strict`;

    // Navigate to Alt Auth
    window.location.href = `${ALT_AUTH_URL}/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Example Site</h1>
        <p className="text-gray-600 mb-6">
          This is a demo site that uses Alt Auth for authentication.
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-[#614051] text-white py-3 px-4 rounded font-medium hover:opacity-90 transition-opacity"
        >
          Login with Alt Auth
        </button>
      </div>
    </div>
  );
}
