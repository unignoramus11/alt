import { COLORS } from "@/lib/constants";

export default function Home() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.background }}
    >
      <div
        className="text-center p-8"
        style={{
          border: `2px solid ${COLORS.primary}`,
          maxWidth: "400px",
        }}
      >
        <h1
          className="text-2xl font-medium mb-4"
          style={{ color: COLORS.primary }}
        >
          Alt Auth
        </h1>
        <p className="text-sm" style={{ color: COLORS.primary }}>
          Universal authentication service
        </p>
      </div>
    </div>
  );
}
