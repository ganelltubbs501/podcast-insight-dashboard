import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing invite link...");

  useEffect(() => {
    (async () => {
      try {
        const search = window.location.search || "";
        const searchParams = new URLSearchParams(search);
        const pkceCode = searchParams.get("code");
        const type = searchParams.get("type");

        // Get the full URL hash which contains the tokens (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");
        const effectiveType = type || hashType;

        console.log("AuthCallback: type=", effectiveType, "hasAccessToken=", !!accessToken, "hasPkceCode=", !!pkceCode);

        // PKCE flow: exchange code for session
        if (pkceCode) {
          setStatus("Setting up your session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);

          if (error) {
            console.error("PKCE exchange error:", error);
            setStatus("Error: " + error.message);
            setTimeout(() => navigate("/login"), 2000);
            return;
          }

          if (data?.session) {
            console.log("PKCE session established, redirecting to set-password");
            const target = effectiveType === "recovery" ? "/set-password?type=recovery" : "/set-password";
            navigate(target, { replace: true });
            return;
          }
        }

        // Implicit flow: tokens in URL hash
        if (accessToken && refreshToken) {
          setStatus("Setting up your session...");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session:", error);
            setStatus("Error: " + error.message);
            setTimeout(() => navigate("/login"), 2000);
            return;
          }

          if (data?.session) {
            console.log("Session established, redirecting to set-password");
            const target = effectiveType === "recovery" ? "/set-password?type=recovery" : "/set-password";
            navigate(target, { replace: true });
            return;
          }
        }

        // Check if we already have a session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const target = effectiveType === "recovery" ? "/set-password?type=recovery" : "/set-password";
          navigate(target, { replace: true });
          return;
        }

        // No tokens and no session - redirect to login
        setStatus("No valid session found. Redirecting...");
        setTimeout(() => navigate("/login"), 1500);
      } catch (err: any) {
        console.error("AuthCallback error:", err);
        setStatus("Error: " + err.message);
        setTimeout(() => navigate("/login"), 2000);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
          LQ
        </div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
