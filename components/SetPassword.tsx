import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

export default function SetPassword() {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if user came from a password recovery link
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsRecovery(params.get("type") === "recovery");
  }, [location.search]);

  const submit = async () => {
    setError(null);
    setOk(null);

    if (!isRecovery && !fullName.trim()) return setError("Please enter your full name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      // Check if we have an active session
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setError("No active session. Please open your invite link again.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Save name to profiles table (non-blocking for recovery)
      if (!isRecovery && fullName.trim()) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', userData.user.id);

        if (profileError) {
          console.warn('Failed to save name:', profileError);
        }
      }

      setOk(isRecovery ? "Password reset successfully!" : "Password set. You're all set!");
      // Check for pending team invite — redirect there instead of dashboard
      const pendingToken = localStorage.getItem('pendingInviteToken');
      if (pendingToken) {
        setTimeout(() => navigate(`/invite?token=${pendingToken}`, { replace: true }), 800);
      } else {
        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 light">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            LQ
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRecovery ? "Reset your password" : "Complete your account"}
          </h2>
          <p className="text-gray-500 mt-1">
            {isRecovery
              ? "Enter your new password below"
              : "Tell us your name and create a password"}
          </p>
        </div>

        <div className="space-y-4">
          {!isRecovery && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
              placeholder="Confirm your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {ok && (
            <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">
              {ok}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Please wait..." : isRecovery ? "Reset Password" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
