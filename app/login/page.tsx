"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { COLORS } from "@/lib/constants";
import EmailStep from "./components/EmailStep";
import OTPStep from "./components/OTPStep";
import PasswordStep from "./components/PasswordStep";
import ProfileStep from "./components/ProfileStep";

type Step = "email" | "otp" | "password" | "profile";

interface AuthState {
  email: string;
  userId: string;
  isNewUser: boolean;
  hasPasswordAuth: boolean;
  profileCompleted: boolean;
  requestId: string;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [prevStep, setPrevStep] = useState<Step | null>(null);
  const [authState, setAuthState] = useState<AuthState>({
    email: "",
    userId: "",
    isNewUser: true,
    hasPasswordAuth: false,
    profileCompleted: false,
    requestId: searchParams.get("request_id") || "",
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Finalize auth and redirect
  const finalizeAuth = async (userId: string, reqId: string) => {
    try {
      const res = await fetch("/api/auth/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reqId,
          userId,
        }),
      });

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      console.error("Failed to finalize auth:", error);
    }
  };

  useEffect(() => {
    // Initialize auth request capturing the referrer
    const initAuth = async (): Promise<string | null> => {
      // Capture referrer origin from document.referrer
      const referrerOrigin = document.referrer
        ? new URL(document.referrer).origin
        : window.location.origin;

      try {
        const res = await fetch("/api/auth/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referrerOrigin }),
        });
        const data = await res.json();
        if (data.requestId) {
          setAuthState((prev) => ({ ...prev, requestId: data.requestId }));
          return data.requestId;
        }
      } catch (error) {
        console.error("Failed to init auth:", error);
      }
      return null;
    };

    // Check if user already has a valid session
    const checkExistingSession = async (requestId: string) => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            // User is already logged in, finalize the auth flow
            await finalizeAuth(data.user.id, requestId);
            return true;
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
      return false;
    };

    const init = async () => {
      // First, init auth to get a requestId with the referrer
      const requestId = await initAuth();

      if (requestId) {
        // Then check if already logged in
        const wasRedirected = await checkExistingSession(requestId);
        if (wasRedirected) return;
      }

      setIsCheckingSession(false);
    };

    init();
  }, [searchParams]);

  const goToStep = (step: Step) => {
    setIsAnimating(true);
    setPrevStep(currentStep);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 300);
  };

  const handleEmailSubmit = async (
    email: string,
    userInfo: {
      isNewUser: boolean;
      hasPasswordAuth: boolean;
      profileCompleted: boolean;
    }
  ) => {
    setAuthState((prev) => ({
      ...prev,
      email,
      isNewUser: userInfo.isNewUser,
      hasPasswordAuth: userInfo.hasPasswordAuth,
      profileCompleted: userInfo.profileCompleted,
    }));

    if (!userInfo.isNewUser && userInfo.hasPasswordAuth) {
      goToStep("password");
    } else {
      goToStep("otp");
    }
  };

  const handleOTPVerified = (
    userId: string,
    isNewUser: boolean,
    profileCompleted: boolean
  ) => {
    setAuthState((prev) => ({ ...prev, userId, isNewUser, profileCompleted }));

    if (isNewUser || !profileCompleted) {
      goToStep("profile");
    } else {
      handleFinalize(userId);
    }
  };

  const handlePasswordVerified = (
    userId: string,
    profileCompleted: boolean
  ) => {
    setAuthState((prev) => ({ ...prev, userId, profileCompleted }));

    if (!profileCompleted) {
      goToStep("profile");
    } else {
      handleFinalize(userId);
    }
  };

  const handleForgotPassword = () => {
    goToStep("otp");
  };

  const handleProfileComplete = () => {
    handleFinalize(authState.userId);
  };

  const handleFinalize = async (userId: string) => {
    try {
      const res = await fetch("/api/auth/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: authState.requestId,
          userId,
        }),
      });

      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      console.error("Failed to finalize auth:", error);
    }
  };

  const getStepDirection = () => {
    const stepOrder: Step[] = ["email", "otp", "password", "profile"];
    const currentIndex = stepOrder.indexOf(currentStep);
    const prevIndex = prevStep ? stepOrder.indexOf(prevStep) : -1;
    return currentIndex > prevIndex ? "forward" : "backward";
  };

  const renderStep = () => {
    switch (currentStep) {
      case "email":
        return (
          <EmailStep
            requestId={authState.requestId}
            onSubmit={handleEmailSubmit}
          />
        );
      case "otp":
        return (
          <OTPStep
            email={authState.email}
            requestId={authState.requestId}
            onVerified={handleOTPVerified}
            onBack={() => goToStep("email")}
          />
        );
      case "password":
        return (
          <PasswordStep
            email={authState.email}
            requestId={authState.requestId}
            onVerified={handlePasswordVerified}
            onForgotPassword={handleForgotPassword}
            onBack={() => goToStep("email")}
          />
        );
      case "profile":
        return (
          <ProfileStep
            userId={authState.userId}
            email={authState.email}
            onComplete={handleProfileComplete}
          />
        );
    }
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.background }}
      >
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: COLORS.primary,
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.background }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          backgroundColor: COLORS.background,
          border: `2px solid ${COLORS.primary}`,
        }}
      >
        <div className="p-8">
          <div
            className={`transition-transform duration-300 ease-in-out ${
              isAnimating
                ? getStepDirection() === "forward"
                  ? "-translate-x-full opacity-0"
                  : "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: COLORS.background }}
    >
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{
          borderColor: COLORS.primary,
          borderTopColor: "transparent",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
