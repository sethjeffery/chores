import type { PropsWithChildren } from "react";

interface AppHeaderProps extends PropsWithChildren {
  size?: "small" | "large";
}
export default function AppHeader({
  children,
  size = "small",
}: AppHeaderProps) {
  const className =
    size === "small"
      ? "text-2xl md:text-3xl lg:text-4xl"
      : "text-3xl md:text-5xl lg:text-6xl";

  return (
    <header className="w-full mb-2 md:mt-2 md:mb-3">
      <div className="relative flex flex-row md:flex-col md:justify-center items-start md:items-center px-4 py-3 max-w-7xl mx-auto">
        <h1
          className={`${className} font-bold text-white font-fancy cartoon-text-shadow flex items-center`}
        >
          <img
            src="/pocket-bunnies-head.png"
            alt="Pocket Bunny logo"
            className="w-10 h-10 mr-2 md:hidden"
          />
          Pocket Bunnies
        </h1>

        {children}
      </div>
    </header>
  );
}
