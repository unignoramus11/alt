import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  rollNumber?: string;
  batch?: string;
  branch?: string;
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  if (!sessionCookie?.value) {
    redirect("/");
  }

  let user: UserProfile;
  try {
    user = JSON.parse(sessionCookie.value);
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Username</label>
            <p className="text-gray-800 font-medium">{user.username || "-"}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="text-gray-800 font-medium">{user.email}</p>
          </div>

          {user.rollNumber && (
            <div>
              <label className="text-sm text-gray-500">Roll Number</label>
              <p className="text-gray-800 font-medium">{user.rollNumber}</p>
            </div>
          )}

          {user.batch && (
            <div>
              <label className="text-sm text-gray-500">Batch</label>
              <p className="text-gray-800 font-medium">{user.batch}</p>
            </div>
          )}

          {user.branch && (
            <div>
              <label className="text-sm text-gray-500">Branch</label>
              <p className="text-gray-800 font-medium">{user.branch}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
