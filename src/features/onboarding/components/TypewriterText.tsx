import { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

interface TypewriterTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  /** İlk harften önceki bekleme (ms). */
  startDelay?: number;
  /** Harf başına süre (ms). */
  charDelay?: number;
  /** Hareketi azalt: metin hemen tam görünür. */
  instant?: boolean;
}

/**
 * Harf harf yazılan başlık (referans onboarding'deki gibi). Henüz yazılmamış
 * kısım GÖRÜNMEZ ama yerini tutar: satır kırılımı baştan sabit, metin zıplamaz.
 * Metin değişirse yeniden yazmak için çağıran `key={text}` vermeli.
 */
export function TypewriterText({
  text,
  style,
  startDelay = 500,
  charDelay = 42,
  instant = false,
}: TypewriterTextProps) {
  const [count, setCount] = useState(0);
  const letters = Array.from(text);
  const shown = instant ? letters.length : count;

  useEffect(() => {
    if (instant) return;
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      current += 1;
      setCount(current);
      if (current < letters.length) timer = setTimeout(tick, charDelay);
    };
    timer = setTimeout(tick, startDelay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, instant, startDelay, charDelay]);

  return (
    <Text style={style} accessibilityLabel={text}>
      {letters.slice(0, shown).join("")}
      <Text style={{ opacity: 0 }}>{letters.slice(shown).join("")}</Text>
    </Text>
  );
}
