import type { PropsWithChildren } from "react";

interface ToastProps extends PropsWithChildren {
  icon?: React.ReactNode;
  isOpen: boolean;
}

export default function Toast({ children, icon, isOpen }: ToastProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 flex items-center z-50 animate-fade-in">
      <div className="bg-white text-gray-700 shadow-lg rounded-lg py-2 px-4 flex items-center space-x-3 border-l-4 border-yellow-500">
        {icon}
        <span className="text-sm font-medium">{children}</span>
      </div>
    </div>
  );
}
