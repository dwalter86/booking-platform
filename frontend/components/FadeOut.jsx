'use client';
import { useEffect, useRef } from 'react';

export default function FadeOut({ delay = 4000, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.style.transition = 'opacity 1s ease';
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, 1000);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}
