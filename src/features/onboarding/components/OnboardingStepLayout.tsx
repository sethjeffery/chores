import type { ReactNode } from "react";

interface OnboardingStepLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onSkip?: () => void;
  showSkip?: boolean;
}

export default function OnboardingStepLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  onSkip,
  showSkip = true,
}: OnboardingStepLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-cartoon p-6 w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <img
            src="/pocket-bunnies-head.png"
            alt="Pocket Bunnies Logo"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800 font-fancy">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}

          {/* Progress indicator */}
          <div className="mt-4 flex justify-center">
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Content area */}
        <div className="mt-4">{children}</div>

        {/* Skip button */}
        {showSkip && onSkip && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
