"use client";

import { useEffect, useState } from "react";
import { StatsResponse } from "@/lib/types";
import { BookOpen, CheckCircle2, Star } from "lucide-react";

export function StatsCards() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
            <div className="h-4 bg-accent rounded w-16 mb-3" />
            <div className="h-8 bg-accent rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "总题目数",
      value: stats.total_questions,
      icon: <BookOpen className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "已掌握",
      value: stats.mastered_count,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "收藏",
      value: stats.favorite_count,
      icon: <Star className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <span className={`${card.bg} p-1.5 rounded-lg ${card.color}`}>
              {card.icon}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
