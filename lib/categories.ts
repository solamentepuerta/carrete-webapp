export const categories = [
  {
    id: 1,
    key: "smile",
    label: "Me sacó una sonrisa",
    emoji: "😊",
    imageSrc: "/images/carrete-01.jpg"
  },
  {
    id: 2,
    key: "you",
    label: "Me acordé de ti",
    emoji: "💭",
    imageSrc: "/images/carrete-02.jpg"
  },
  {
    id: 3,
    key: "now",
    label: "Lo que veo ahora",
    emoji: "👀",
    imageSrc: "/images/carrete-03.jpg"
  },
  {
    id: 4,
    key: "mood",
    label: "Mi mood de hoy",
    emoji: "🌈",
    imageSrc: "/images/carrete-04.jpg"
  },
  {
    id: 5,
    key: "wish",
    label: "Ojalá estuvieras aquí",
    emoji: "🫶",
    imageSrc: "/images/carrete-05.jpg"
  }
] as const;

export type Category = (typeof categories)[number];
