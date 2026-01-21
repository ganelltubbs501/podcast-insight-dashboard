import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    setOk(null);

    if (password.length < 6) return setError("Password must be at least 6 characters.");
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

      setOk("Password set. You're all set!");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (e: any) {
      setError(e?.message ?? "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
            LQ
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Set your password</h2>
          <p className="text-gray-500 mt-1">Create a password to complete your account setup</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="At least 6 characters"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
            {loading ? "Please wait..." : "Save Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
