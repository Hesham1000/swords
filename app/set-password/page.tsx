"use client";

import { useState, FormEvent, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

// Validation regex pattern
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

interface PasswordData {
  password: string;
  confirmPassword: string;
}

interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  passwordsMatch: boolean;
}

const SetPasswordContent = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type"); // "activate" or "reset"

  const [isLoading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PasswordData>({
    password: "",
    confirmPassword: "",
  });

  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    passwordsMatch: false,
  });

  // Refs for form inputs
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  // Validation message refs
  const validationRefs = {
    password: useRef<HTMLParagraphElement>(null),
    confirmPassword: useRef<HTMLParagraphElement>(null),
  };

  // Update requirements dynamically
  useEffect(() => {
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    setRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0,
    });
  }, [formData.password, formData.confirmPassword]);

  const handleInputChange =
    (field: keyof PasswordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const showValidationError = (field: string, message: string) => {
    const ref = validationRefs[field as keyof typeof validationRefs];
    if (ref.current) {
      ref.current.textContent = message;
      ref.current.classList.add("show");
    }
  };

  const clearValidationError = (field: string) => {
    const ref = validationRefs[field as keyof typeof validationRefs];
    if (ref.current) {
      ref.current.classList.remove("show");
    }
  };

  const validatePasswords = (): boolean => {
    const passwordValid = PASSWORD_REGEX.test(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword;

    if (!passwordValid) {
      showValidationError(
        "password",
        "Password must meet all requirements below"
      );
      return false;
    }

    if (!passwordsMatch) {
      showValidationError("confirmPassword", "Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (!validatePasswords()) {
      return;
    }

    if (!token) {
      showValidationError("password", "Invalid or missing token");
      return;
    }

    setLoading(true);


    try {
      const response = await fetch(`${apiUrl}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      if (response.ok) {
        const successMessage =
          type === "activate"
            ? "Account activated successfully!"
            : "Password reset successfully!";
        console.log(successMessage);
        router.push("/dashboard");
      } else {
        const error = await response.json();
        showValidationError("password", error.message || "Operation failed");
      }
    } catch (error) {
      console.error("Set password error:", error);
      showValidationError("password", "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fencingImg = "/suit.jpg";

  // Dynamic titles based on type
  const pageTitle =
    type === "activate" ? "Activate Your Account" : "Reset Your Password";
  const pageSubtitle =
    type === "activate"
      ? "Set your password to complete account setup"
      : "Enter your new password to regain access";
  const formTitle =
    type === "activate" ? "Create Your Password" : "Create New Password";
  const formSubtitle =
    type === "activate"
      ? "Choose a strong password to secure your account"
      : "Your new password must be different from previous passwords";
  const buttonText =
    type === "activate" ? "Activate Account" : "Reset Password";

  return (
    <section className="set-password-page">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>{type === "activate" ? "Activating..." : "Resetting..."}</p>
          </div>
        </div>
      )}

      <div className="set-password-container">
        <div className="password-image-side">
          <Image
            src={fencingImg}
            alt="Fencing athlete"
            width={800}
            height={800}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            priority
          />
          <div className="image-overlay">
            <h2>{pageTitle}</h2>
            <p>{pageSubtitle}</p>
          </div>
        </div>

        <div className="password-form-side">
          <div className="password-form-content">
            <div className="password-header">
              <h1>{formTitle}</h1>
              <p>{formSubtitle}</p>
            </div>

            <form onSubmit={handleSetPassword}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="form__group field">
                  <input
                    type="password"
                    className="password-input"
                    value={formData.password}
                    onChange={handleInputChange("password")}
                    onFocus={() => clearValidationError("password")}
                    ref={passwordInputRef}
                    placeholder=" "
                  />
                  <label className="form__label">New Password</label>
                  <p className="validation" ref={validationRefs.password}></p>
                </div>

                <div className="form__group field">
                  <input
                    type="password"
                    className="password-input"
                    value={formData.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    onFocus={() => clearValidationError("confirmPassword")}
                    ref={confirmPasswordInputRef}
                    placeholder=" "
                  />
                  <label className="form__label">Confirm Password</label>
                  <p
                    className="validation"
                    ref={validationRefs.confirmPassword}
                  ></p>
                </div>

                <div className="password-requirements">
                  <h4>Password Requirements:</h4>
                  <ul>
                    <li className={requirements.minLength ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.minLength ? "✓" : "○"}
                      </span>
                      At least 8 characters
                    </li>
                    <li className={requirements.hasUppercase ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.hasUppercase ? "✓" : "○"}
                      </span>
                      One uppercase letter (A-Z)
                    </li>
                    <li className={requirements.hasLowercase ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.hasLowercase ? "✓" : "○"}
                      </span>
                      One lowercase letter (a-z)
                    </li>
                    <li className={requirements.hasNumber ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.hasNumber ? "✓" : "○"}
                      </span>
                      One number (0-9)
                    </li>
                    <li className={requirements.hasSpecial ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.hasSpecial ? "✓" : "○"}
                      </span>
                      One special character (@$!%*?&)
                    </li>
                    <li className={requirements.passwordsMatch ? "valid" : ""}>
                      <span className="requirement-icon">
                        {requirements.passwordsMatch ? "✓" : "○"}
                      </span>
                      Passwords match
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  className="password-btn"
                  disabled={isLoading}
                >
                  {isLoading
                    ? type === "activate"
                      ? "Activating..."
                      : "Resetting..."
                    : buttonText}
                </button>

                {/* <div className="back-to-login">
                  <a href="/login">Back to Login</a>
                </div> */}
              </motion.div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const SetPassword = () => {
  return (
    <Suspense fallback={
      <div className="loading-overlay">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading security context...</p>
        </div>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
};

export default SetPassword;
