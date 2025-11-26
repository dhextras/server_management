# WorkOS Google OAuth - Setup Guide for Other Projects

Copy-paste setup for: ticker_deck, todo_manager, ticker_scraper_ws

---

## Quick Start (All Projects)

### 1. Install WorkOS
```bash
npm install @workos-inc/authkit-react  # For React/Remix projects
pip install workos                      # For Python projects
```

### 2. WorkOS Dashboard
- **API Keys**: Copy Client ID
- **Authentication** → **Social Login**: Enable Google
- **Authentication** → **Configure CORS**: Add `http://localhost:3000`, `https://yourdomain.com`
- **Redirects**: Add `http://localhost:3000/callback`, `https://yourdomain.com/callback`

### 3. Add to .env
```env
VITE_WORKOS_CLIENT_ID=client_01HGEYD37KH0XDKK2FWS3SGTCT
```

---

## Remix/React Projects (ticker_deck, todo_manager)

### Setup AuthKitProvider (root.tsx or main.jsx)
```typescript
import { AuthKitProvider } from '@workos-inc/authkit-react';

<AuthKitProvider 
  clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
  apiHostname="api.workos.com"
  redirectUri={window.location.origin + '/callback'}
  onRedirectCallback={() => {
    window.location.href = '/';
  }}
>
  <App />
</AuthKitProvider>
```

### Create UserProfile Component
```typescript
import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';

export function UserProfile() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, signOut } = useAuth();

  if (!user) return null;

  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.email;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2"
      >
        <img
          src={user.profilePictureUrl}
          alt={displayName}
          className="h-8 w-8 rounded-full border-2 border-gray-600 object-cover"
        />
        <span>{displayName}</span>
      </button>

      {showDropdown && (
        <div className="dropdown">
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      )}
    </div>
  );
}
```

### Update Login Route
```typescript
import { useAuth } from '@workos-inc/authkit-react';

export default function Index() {
  const { user, isLoading, signIn } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  
  if (!user) {
    if (window.location.pathname !== '/callback') {
      signIn();
    }
    return <div>Redirecting...</div>;
  }

  // Redirect to dashboard or show content
  return <Navigate to="/dashboard" />;
}
```

### Delete Old Auth Files
```bash
rm app/utils/auth.server.ts  # Old username/password auth
```

---

## Python/Flask Project (ticker_scraper_ws)

### Install
```bash
pip install workos
```

### Update server.py
```python
import os
from flask import Flask, redirect, request, session
from workos import WorkOSClient

app = Flask(__name__)
app.secret_key = os.getenv("SESSION_SECRET", "change-me")

workos = WorkOSClient(api_key=os.getenv("WORKOS_API_KEY"))

@app.route("/")
def index():
    if "user" not in session:
        return redirect("/auth/login")
    return render_template("index.html", user=session["user"])

@app.route("/auth/login")
def login():
    auth_url = workos.user_management.get_authorization_url(
        client_id=os.getenv("WORKOS_CLIENT_ID"),
        redirect_uri=request.host_url + "auth/callback",
        provider="authkit"
    )
    return redirect(auth_url)

@app.route("/auth/callback")
def callback():
    code = request.args.get("code")
    result = workos.user_management.authenticate_with_code(
        client_id=os.getenv("WORKOS_CLIENT_ID"),
        code=code
    )
    
    user = result["user"]
    session["user"] = {
        "email": user["email"],
        "name": f"{user.get('first_name', '')} {user.get('last_name', '')}",
        "profile_picture": user.get("profile_picture_url")
    }
    
    return redirect("/")

@app.route("/auth/logout")
def logout():
    session.clear()
    return redirect("/")
```

### Update .env
```env
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_01HGEYD37KH0XDKK2FWS3SGTCT
SESSION_SECRET=your-secret-here
```

### Update HTML
```html
<img src="{{ user.profile_picture }}" 
     style="width: 32px; height: 32px; border-radius: 50%;">
<span>{{ user.name }}</span>
<a href="/auth/logout">Sign Out</a>
```

---

## Testing

1. Start server
2. Visit app
3. Should redirect to Google login
4. Sign in
5. Redirected back to app
6. Profile pic shows
7. Session lasts 1 month

---

## Production

Add to WorkOS Dashboard:
- **CORS**: `https://servers.maribeth.io`
- **Redirect**: `https://servers.maribeth.io/callback`

Done!
