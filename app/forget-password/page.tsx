"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

interface ForgotPasswordData {
  email: string;
}

const ForgotPassword = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      email: e.target.value,
    });
    // Clear any existing errors
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Here you would typically call your API endpoint
      const response = await fetch(`${apiUrl}/api/auth/forget-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setSuccess("Password reset instructions have been sent to your email.");
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        setError(
          errorData.message ||
            "Failed to send reset instructions. Please try again."
        );
      }
    } catch (error) {
      setError("An error occurred. Please try again later.");
      console.error("Forgot password error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fencingImg = "/training.jpg";

  return (
    <section className="forgot-password-page">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        </div>
      )}

      <div className="forgot-password-container">
        <div className="forgot-password-wrapper">
          {/* Image Section */}
          <div className="forgot-image-section">
            <div className="image-overlay"></div>
            <Image
              src={fencingImg}
              alt="Fencer in action"
              width={800}
              height={600}
              className="forgot-password-image"
              priority
            />
            <div className="image-content">
              <h2>Reset Your Password</h2>
              <p>
                Enter your email address and we'll send you instructions to
                reset your password.
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="forgot-form-section">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="form-content"
            >
              <div className="logo-header">
                <h1>Kings Marketplace</h1>
                <p className="subtitle">Reset your account password</p>
              </div>

              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="forgot-password-form">
                  <div className="instruction-text">
                    <p>
                      Enter the email address associated with your account, and
                      we'll send you a link to reset your password.
                    </p>
                  </div>

                  <div className="form__group field">
                    <input
                      type="email"
                      className="fencing-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder=" "
                      disabled={isLoading}
                      required
                    />
                    <label className="form__label">Email Address</label>
                  </div>

                  {error && (
                    <div className="error-message">
                      <span className="error-icon">⚠️</span>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="fencing-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Instructions"}
                  </button>

                  <div className="back-to-login">
                    <button
                      type="button"
                      className="back-link"
                      onClick={() => router.push("/sign-in")}
                      disabled={isLoading}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="success-message"
                >
                  <div className="success-icon">
                    <span>✓</span>
                  </div>
                  <h3>Check Your Email</h3>
                  <p className="success-text">{success}</p>
                  <div className="instructions">
                    <p>
                      <strong>What to do next:</strong>
                    </p>
                    <ul>
                      <li>Check your email inbox</li>
                      <li>Click the reset link in the email</li>
                      <li>Follow the instructions to set a new password</li>
                    </ul>
                  </div>
                  <div className="action-buttons">
                    <button
                      className="fencing-btn"
                      onClick={() => router.push("/sign-in")}
                    >
                      Return to Sign In
                    </button>
                    <button
                      className="fencing-btn outline"
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ email: "" });
                      }}
                    >
                      Send Another Email
                    </button>
                  </div>
                  <p className="help-text">
                    Didn't receive the email? Check your spam folder or make
                    sure you entered the correct email address.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;