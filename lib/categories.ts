export const categories = [
  {
    id: 1,
    key: "smile",
    label: "Me sacó una sonrisa",
    emoji: "😊"
  },
  {
    id: 2,
    key: "you",
    label: "Me acordé de ti",
    emoji: "💭"
  },
  {
    id: 3,
    key: "now",
    label: "Lo que veo ahora",
    emoji: "👀"
  },
  {
    id: 4,
    key: "mood",
    label: "Mi mood de hoy",
    emoji: "🌈"
  },
  {
    id: 5,
    key: "wish",
    label: "Ojalá estuvieras aquí",
    emoji: "🫶"
  }
] as const;

export type Category = (typeof categories)[number];
