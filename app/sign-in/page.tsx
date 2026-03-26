"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

interface FormData {
  email: string;
  password: string;
  username: string;
}

// Add an interface for API error response
interface ApiError {
  error?: string;
  message?: string;
  statusCode?: number;
}

const FencingLogin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Add error state
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<{
    field?: string;
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    username: "",
  });

  // Refs for form inputs
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const loginUsernameRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);

  // Validation message refs
  const validationRefs = {
    username: useRef<HTMLParagraphElement>(null),
    email: useRef<HTMLParagraphElement>(null),
    loginUsername: useRef<HTMLParagraphElement>(null),
    loginPassword: useRef<HTMLParagraphElement>(null),
    password: useRef<HTMLParagraphElement>(null), // Add this
  };

  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
    setCurrentStep(1);
    // Clear errors when switching forms
    setError(null);
    setFormError(null);
  };

  const handleInputChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
      // Clear errors when user starts typing
      if (error || formError) {
        setError(null);
        setFormError(null);
      }
      // Map field names correctly for clearValidationError
      if (field === "email" && isLoginForm) {
        clearValidationError("loginUsername");
      } else if (field === "password" && isLoginForm) {
        clearValidationError("loginPassword");
      } else {
        clearValidationError(field);
      }
    };

  const showValidationError = (field: string, message: string) => {
    const ref = validationRefs[field as keyof typeof validationRefs];
    if (ref?.current) {
      ref.current.textContent = message;
      ref.current.classList.add("show");
    }
  };

  const clearValidationError = (field: string) => {
    const ref = validationRefs[field as keyof typeof validationRefs];
    if (ref?.current) {
      ref.current.classList.remove("show");
    }
  };

  // Helper function to display API errors
  const displayApiError = (errorData: ApiError) => {
    // Try to get error message from different possible fields
    const errorMessage =
      errorData.error || errorData.message || "An unexpected error occurred";

    // For login errors like "incorrect email or password"
    if (
      errorMessage.toLowerCase().includes("incorrect") ||
      errorMessage.toLowerCase().includes("invalid") ||
      errorMessage.toLowerCase().includes("email") ||
      errorMessage.toLowerCase().includes("password")
    ) {
      setError(errorMessage);
      setFormError(null); // Clear any field-specific errors
    } else if (errorMessage.toLowerCase().includes("username")) {
      setFormError({
        field: "email", // Map username errors to email field for login
        message: errorMessage,
      });
      setError(null);
    } else {
      setError(errorMessage);
      setFormError(null);
    }
  };

  // Registration function with error handling
  const register = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormError(null);

    // Basic validation
    if (!formData.username.trim() || !formData.email.trim()) {
      setError("Username and email are required!");
      return;
    }

    setLoading(true);

    const userData = {
      username: formData.username,
      email: formData.email,
    };

    try {
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Registration successful");
        router.push("/sign-in");
      } else {
        // Display error from API response
        displayApiError(data);
        console.error("Registration failed:", data.error || data.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Login function with error handling
  const login = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormError(null);

    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Email and password are required!");
      return;
    }

    setLoading(true);

    const loginData = {
      email: formData.email,
      password: formData.password,
    };

    try {
      const response = await fetch(`${apiUrl}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful");
        router.push("/dashboard");
      } else {
        // Display error from API response
        displayApiError(data);
        console.error("Login failed:", data.error || data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Username & Email Form
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="step-content"
    >
      <h2>Create Account</h2>

      {/* Display general error message for registration */}
      {error && !formError && (
        <div className="general-error-message registration-error">{error}</div>
      )}

      <div className="form__group field">
        <input
          type="text"
          className={`fencing-input ${formError?.field === "username" ? "error" : ""
            }`}
          value={formData.username}
          onChange={handleInputChange("username")}
          onFocus={() => clearValidationError("username")}
          ref={usernameInputRef}
          placeholder=" "
        />
        <label className="form__label">Username</label>
        <p className="validation" ref={validationRefs.username}></p>
        {/* Display field-specific error above the input */}
        {formError && formError.field === "username" && (
          <div className="field-error-message">{formError.message}</div>
        )}
      </div>

      <div className="form__group field">
        <input
          type="email"
          className={`fencing-input ${formError?.field === "email" ? "error" : ""
            }`}
          value={formData.email}
          onChange={handleInputChange("email")}
          onFocus={() => clearValidationError("email")}
          ref={emailInputRef}
          placeholder=" "
        />
        <label className="form__label">Email Address</label>
        <p className="validation" ref={validationRefs.email}></p>
        {/* Display field-specific error above the input */}
        {formError && formError.field === "email" && (
          <div className="field-error-message">{formError.message}</div>
        )}
      </div>

      <button
        type="button"
        className="fencing-btn"
        onClick={register}
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Sign Up"}
      </button>
    </motion.div>
  );

  // Login Form
  const renderLoginForm = () => (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="step-content"
    >
      <div className="form__group field">
        <input
          type="text"
          className={`fencing-input ${formError?.field === "email" || formError?.field === "username"
              ? "error"
              : ""
            }`}
          value={formData.email}
          onChange={handleInputChange("email")}
          onFocus={() => {
            clearValidationError("loginUsername");
            if (error || formError) {
              setError(null);
              setFormError(null);
            }
          }}
          ref={loginUsernameRef}
          placeholder=" "
        />
        <label className="form__label">Email or Username</label>
        <p className="validation" ref={validationRefs.loginUsername}></p>
        {/* Display field-specific error above the input */}
        {formError &&
          (formError.field === "email" || formError.field === "username") && (
            <div className="field-error-message">{formError.message}</div>
          )}
      </div>

      <div className="form__group field">
        <input
          type={showPassword ? "text" : "password"}
          className={`fencing-input ${formError?.field === "password" ? "error" : ""
            }`}
          value={formData.password}
          onChange={handleInputChange("password")}
          onFocus={() => {
            clearValidationError("loginPassword");
            if (error || formError) {
              setError(null);
              setFormError(null);
            }
          }}
          ref={loginPasswordRef}
          placeholder=" "
        />
        <label className="form__label">Password</label>
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        <p className="validation" ref={validationRefs.loginPassword}></p>
        {/* Display field-specific error above the input */}
        {formError && formError.field === "password" && (
          <div className="field-error-message">{formError.message}</div>
        )}
      </div>

      {/* Display general error message between inputs and forgot password */}
      {error && (
        <div className="general-error-message login-error">{error}</div>
      )}

      <div className="forgot-password-container">
        <button
          type="button"
          className="forgot-password-link"
          onClick={() => router.push("/forget-password")}
        >
          Forget Password?
        </button>
      </div>

      <button
        type="submit"
        className="fencing-btn"
        onClick={login}
        disabled={isLoading}
      >
        {isLoading ? "Signing In..." : "Sign In"}
      </button>
    </motion.div>
  );

  // Images for the two sides
  const fencingImg2 = "/suit.jpg";
  const fencingImg1 = "/training.jpg";

  return (
    <section className="fencing-login">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p style={{ color: "white", fontSize: "18px" }}>Processing...</p>
          </div>
        </div>
      )}

      <div className={`container ${!isLoginForm ? "active" : ""}`}>
        {/* Login Form */}
        <div className="user singinBx">
          <div className="imgBx">
            <Image
              src={fencingImg1}
              alt="Fencing athletes resting with epee"
              width={800}
              height={600}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>
          <div className="formBx">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="sidebar-header" style={{ padding: "0 0 2rem 0", background: "none" }}>
                <motion.div
                  className="sidebar-brand"
                  style={{ padding: 0, justifyContent: "flex-start", fontSize: "32px", display: "flex", alignItems: "center", gap: "12px" }}
                  animate={{ textShadow: ["0 0 0px var(--accent-blue)", "0 0 8px var(--accent-blue)", "0 0 0px var(--accent-blue)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <img src="/icon.svg" alt="Kings Logo" width="48" height="48" />
                  <motion.span
                    animate={{ backgroundPosition: ["0%", "200%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{
                      background: "linear-gradient(90deg, var(--text-primary), var(--accent-blue), var(--text-primary))",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    KINGS
                  </motion.span>
                </motion.div>
              </div>
              <AnimatePresence mode="wait">{renderLoginForm()}</AnimatePresence>
              <p className="signup">
                Don't have an account?
                <span
                  className="signup-toggle"
                  onClick={toggleForm}
                >
                  Sign up
                </span>
              </p>
            </form>
          </div>
        </div>

        {/* Registration Form */}
        <div className="user singupBx">
          <div className="formBx">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="sidebar-header" style={{ padding: "0 0 2rem 0", background: "none" }}>
                <motion.div
                  className="sidebar-brand"
                  style={{ padding: 0, justifyContent: "flex-start", fontSize: "32px", display: "flex", alignItems: "center", gap: "12px" }}
                  animate={{ textShadow: ["0 0 0px var(--accent-blue)", "0 0 8px var(--accent-blue)", "0 0 0px var(--accent-blue)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <img src="/icon.svg" alt="Kings Logo" width="48" height="48" />
                  <motion.span
                    animate={{ backgroundPosition: ["0%", "200%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{
                      background: "linear-gradient(90deg, var(--text-primary), var(--accent-blue), var(--text-primary))",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    KINGS
                  </motion.span>
                </motion.div>
              </div>
              <AnimatePresence mode="wait">
                {currentStep === 1 ? renderStep1() : null}
              </AnimatePresence>
              <p className="signup" style={{ marginTop: "20px" }}>
                Already have an account?
                <span
                  className="signup-toggle"
                  onClick={toggleForm}
                >
                  Sign in
                </span>
              </p>
            </form>
          </div>
          <div className="imgBx">
            <Image
              src={fencingImg2}
              alt="Fencer with mask in profile"
              width={800}
              height={600}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FencingLogin;
