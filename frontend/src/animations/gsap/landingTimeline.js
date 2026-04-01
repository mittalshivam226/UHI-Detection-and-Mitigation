import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initLandingTimeline(containerRef, sectionsRef) {
  if (!containerRef.current || !sectionsRef || sectionsRef.length < 4) return;
  if (!sectionsRef[0] || !sectionsRef[1] || !sectionsRef[2] || !sectionsRef[3]) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: containerRef.current,
      scroller: "#landing-scroller", // explicit scroller for the overflow-y-auto block
      start: "top top",
      end: "+=400%", // 4 screens of scrolling
      pin: true,
      scrub: 1, // Smooth scrubbing
    }
  });

  // Scene 1 to Scene 2 (Hero to Problem)
  tl.to(sectionsRef[0], { opacity: 0, y: -50, duration: 1 })
    .fromTo(sectionsRef[1], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, "-=0.5")
  
  // Scene 2 to Scene 3 (Problem to Data)
  tl.to(sectionsRef[1], { opacity: 0, y: -50, duration: 1 })
    .fromTo(sectionsRef[2], { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1 }, "-=0.5")

  // Scene 3 to Scene 4 (Data to Solution/CTA)
  tl.to(sectionsRef[2], { opacity: 0, y: -50, duration: 1 })
    .fromTo(sectionsRef[3], { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }, "-=0.5");

  return tl;
}
