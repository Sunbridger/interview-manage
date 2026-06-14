interface TagBadgeProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ name, className = "", onClick }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 ${
        onClick ? "cursor-pointer hover:bg-blue-100 transition-colors" : ""
      } ${className}`}
    >
      {name}
    </span>
  );
}
