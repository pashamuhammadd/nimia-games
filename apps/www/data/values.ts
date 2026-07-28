export interface ValueItem {
  icon: "Sparkles" | "Gamepad2" | "Zap" | "Globe2" | "Users";
  title: string;
  description: string;
}

export const values: ValueItem[] = [
  {
    icon: "Sparkles",
    title: "Creative First",
    description: "We put creativity at the heart of every world we make.",
  },
  {
    icon: "Gamepad2",
    title: "Game Focused",
    description: "We build games and experiences players love to play.",
  },
  {
    icon: "Zap",
    title: "Fast Production",
    description: "Agile workflow with strong delivery discipline.",
  },
  {
    icon: "Globe2",
    title: "Solana Native",
    description:
      "Built for the Solana ecosystem today — true ownership and trading for players — with room to expand into other ecosystems as we grow.",
  },
  {
    icon: "Users",
    title: "Scalable Team",
    description: "A creative production team ready to scale with your vision.",
  },
];
