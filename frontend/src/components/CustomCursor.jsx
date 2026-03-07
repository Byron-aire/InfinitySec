import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = dotRef.current;
    const glow = glowRef.current;
    if (!dot || !glow) return;

    dot.style.display = 'block';
    glow.style.display = 'block';

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const onOver = (e) => {
      if (e.target.closest('a, button, input, textarea, label, select, [role="button"]')) {
        dot.classList.add('cursor-dot--hover');
        glow.classList.add('cursor-glow--hover');
      } else {
        dot.classList.remove('cursor-dot--hover');
        glow.classList.remove('cursor-glow--hover');
      }
    };

    const lerp = (a, b, t) => a + (b - a) * t;
    let raf;
    const animate = () => {
      glowX = lerp(glowX, mouseX, 0.08);
      glowY = lerp(glowY, mouseY, 0.08);
      glow.style.left = `${glowX}px`;
      glow.style.top = `${glowY}px`;
      raf = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    animate();

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="cursor-dot"  ref={dotRef}  style={{ display: 'none' }} />
      <div className="cursor-glow" ref={glowRef} style={{ display: 'none' }} />
    </>
  );
}
