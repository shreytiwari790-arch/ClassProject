import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      return alert("⚠️ Please fill all fields");
    }

    try {
      setLoading(true);

      const userCred = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Logged In:", userCred.user);

      alert("✅ Login Successful");

      // 👉 redirect after login
      navigate("/dashboard");

    } catch (err) {
      console.error(err.message);
      alert("❌ Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">

        {/* Title */}
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
          Welcome Back 👋
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Login to continue your diet tracking
        </p>

        {/* Email */}
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Enter your password"
          className="w-full mb-4 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold transition ${
            loading
              ? "bg-gray-400"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-gray-400 text-sm">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-gray-600">
          Don't have an account?
          <span
            onClick={() => navigate("/register")}
            className="text-blue-500 cursor-pointer ml-1 font-medium hover:underline"
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}