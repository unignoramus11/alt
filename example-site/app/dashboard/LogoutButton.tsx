"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear session cookie via API
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded font-medium hover:bg-gray-300 transition-colors"
    >
      Logout
    </button>
  );
}
