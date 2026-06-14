import { Difficulty } from "@/lib/types";
import { DIFFICULTY_CONFIG } from "@/lib/constants";

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

export function DifficultyBadge({ difficulty, className = "" }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
