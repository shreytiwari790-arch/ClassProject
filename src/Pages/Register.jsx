import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!firstName || !lastName || !age || !height || !weight || !gender || !email || !password) {
      return alert("⚠️ Please fill all fields");
    }

    if (password.length < 6) {
      return alert("⚠️ Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      // Create the user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Save additional user details in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        firstName,
        lastName,
        age: Number(age),
        height: Number(height),
        weight: Number(weight),
        gender,
        email,
        createdAt: new Date().toISOString()
      });

      console.log("User Created:", userCred.user);

      alert("✅ Registered Successfully");

      // 👉 redirect to login after register
      navigate("/login");

    } catch (err) {
      console.error(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-blue-100 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[32rem]">

        {/* Title */}
        <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
          Create Account 🚀
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Start your diet journey today
        </p>

        {/* Name Fields (2 columns) */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <input
            type="text"
            placeholder="First Name"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        {/* Physical Attributes (3 columns) */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <input
            type="number"
            placeholder="Age"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="1"
          />
          <input
            type="number"
            placeholder="Height (cm)"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min="50"
          />
          <input
            type="number"
            placeholder="Weight (kg)"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="10"
          />
        </div>

        {/* Gender */}
        <select
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="" disabled>Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        {/* Email */}
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full mb-3 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Enter your password"
          className="w-full mb-6 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleRegister}
          disabled={loading}
          className={`w-full py-3 rounded-lg text-white font-semibold transition ${
            loading
              ? "bg-gray-400"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-gray-400 text-sm">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Switch to Login */}
        <p className="text-center text-sm text-gray-600">
          Already have an account?
          <span
            onClick={() => navigate("/login")}
            className="text-blue-500 cursor-pointer ml-1 font-medium hover:underline"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}