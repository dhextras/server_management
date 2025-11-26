import { useState } from "react";
import { useAuth } from "@workos-inc/authkit-react";

export const UserProfile = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, signOut } = useAuth();

  if (!user) return null;

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-800"
      >
        {user.profilePictureUrl ? (
          <img
            src={user.profilePictureUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full border-2 border-gray-600 object-cover"
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-700 text-sm font-bold text-white"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-white">{displayName}</span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-12 z-20 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            <div className="p-4">
              <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
                {user.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={displayName}
                    className="h-12 w-12 rounded-full border-2 border-gray-600 object-cover"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-600 bg-gray-700 text-lg font-bold text-white"
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{displayName}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
