import ReactDOM from "react-dom/client";
import { AuthKitProvider } from '@workos-inc/authkit-react';
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
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
);
