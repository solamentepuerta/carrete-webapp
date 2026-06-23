import confetti from "canvas-confetti";

const pastelColors = ["#cdb4ff", "#ffddea", "#fffdf4", "#d8f3dc", "#ffb8d4"];

export function firePastelConfetti(kind: "soft" | "big" = "soft") {
  if (typeof window === "undefined") {
    return;
  }

  const particleCount = kind === "big" ? 92 : 34;
  const spread = kind === "big" ? 82 : 56;

  confetti({
    colors: pastelColors,
    decay: 0.9,
    origin: { y: 0.72 },
    particleCount,
    scalar: kind === "big" ? 0.92 : 0.72,
    spread,
    startVelocity: kind === "big" ? 34 : 22
  });

  if (kind === "big") {
    window.setTimeout(() => {
      confetti({
        colors: pastelColors,
        origin: { x: 0.24, y: 0.72 },
        particleCount: 28,
        scalar: 0.72,
        spread: 48,
        startVelocity: 24
      });
      confetti({
        colors: pastelColors,
        origin: { x: 0.76, y: 0.72 },
        particleCount: 28,
        scalar: 0.72,
        spread: 48,
        startVelocity: 24
      });
    }, 180);
  }
}

export function playSoftChime() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const audioWindow = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass =
      audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99];
    const startedAt = context.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startedAt + index * 0.055;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.28);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.3);
    });

    void context.resume();
    window.setTimeout(() => void context.close(), 520);
  } catch {
    // Audio is optional polish and may be blocked by browser policy.
  }
}
