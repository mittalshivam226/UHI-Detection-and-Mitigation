export const pageTransitions = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -30, filter: "blur(10px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const containerStagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const itemFadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const hoverGlow = {
  rest: { boxShadow: "0px 0px 0px rgba(0, 242, 255, 0)", scale: 1 },
  hover: { 
    boxShadow: "0px 0px 20px rgba(0, 242, 255, 0.4)", 
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
};
