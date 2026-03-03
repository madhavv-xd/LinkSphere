import { useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";

const LOGIN_FIELDS = [
  { name: "email",    label: "Email",    type: "email",    placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", placeholder: "Your password"   },
];

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async (data) => {
    try {
      const res = await fetch("http://localhost:8000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        // Store JWT token for use in protected requests
        localStorage.setItem("token", json.token);
        navigate("/app");
      } else {
        const err = await res.json();
        alert(err.error || "Login failed. Check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Could not connect to server.");
    }
  };

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to your LinkSphere account"
      fields={LOGIN_FIELDS}
      submitLabel="Log In"
      onSubmit={handleLogin}
      footerText="Don't have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    />
  );
}