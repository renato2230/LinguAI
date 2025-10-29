import React from 'react';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SplashScreen } from './SplashScreen';
import { Home } from './pages/Home';
import { Conversation } from './pages/Conversation';
import { CustomCursor } from './components/CustomCursor';

type Page = 'splash' | 'home' | 'conversation';
type Direction = 'forward' | 'backward';

const variants = {
  enter_forward: {
    x: "0vw",
    rotateY: 0,
    scale: 1,
    filter: "blur(0px) brightness(1)",
    opacity: 1,
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }
  },
  initial_forward: {
    x: "12vw",
    rotateY: -8,
    scale: 0.98,
    filter: "blur(8px) brightness(0.9)",
    opacity: 0,
  },
  exit_forward: {
    x: "-12vw",
    rotateY: 8,
    scale: 0.98,
    filter: "blur(10px) brightness(0.9)",
    opacity: 0,
    transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
  },
  enter_backward: {
    x: "0vw",
    rotateY: 0,
    scale: 1,
    filter: "blur(0px) brightness(1)",
    opacity: 1,
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }
  },
  initial_backward: {
    x: "-12vw",
    rotateY: 8,
    scale: 0.98,
    filter: "blur(8px) brightness(0.9)",
    opacity: 0
  },
  exit_backward: {
    x: "12vw",
    rotateY: -8,
    scale: 0.98,
    filter: "blur(10px) brightness(0.9)",
    opacity: 0,
    transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
  }
} as const;

const Overlay = ({ dir }: { dir: Direction }) => (
  <>
    {/* Light Blade */}
    <motion.div
      aria-hidden
      initial={{ x: dir === "forward" ? "120%" : "-120%", skewX: dir === "forward" ? -12 : 12, opacity: 0.0 }}
      animate={{ x: "-120%", opacity: 0.10 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none fixed inset-y-0 w-[35vw] bg-gradient-to-r from-transparent via-[#64C6FF33] to-transparent blur-2xl"
      style={{ right: dir === "forward" ? undefined : 0, left: dir === "forward" ? 0 : undefined }}
    />
    {/* Halo */}
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 0.25, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,#6B00FF22,transparent)]"
    />
  </>
);


const App: React.FC = () => {
  const [page, setPage] = useState<Page>('splash');
  const [direction, setDirection] = useState<Direction>('forward');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage('home');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const changePage = (newPage: Page, newDirection: Direction) => {
    if (newPage === page) return;
    setDirection(newDirection);
    setPage(newPage);
  };
  
  const handleStartConversation = () => changePage('conversation', 'forward');
  const handleGoHome = () => changePage('home', 'backward');

  const baseTransition =
    direction === "forward"
      ? { initial: "initial_forward", animate: "enter_forward", exit: "exit_forward" }
      : { initial: "initial_backward", animate: "enter_backward", exit: "exit_backward" };


  return (
    <>
      <CustomCursor />
        
      {page === 'splash' ? (
        <SplashScreen />
      ) : (
        <div className="relative perspective-1600 w-full h-full">
            <AnimatePresence mode="wait" initial={false}>
                <motion.main
                    key={page}
                    variants={variants}
                    {...baseTransition}
                    className="h-full will-change-transform transform-gpu"
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {page === 'home' && <Home onStart={handleStartConversation} />}
                    {page === 'conversation' && <Conversation onGoHome={handleGoHome} />}
                </motion.main>
            </AnimatePresence>
             <AnimatePresence>
                {page !== 'splash' && <Overlay dir={direction} />}
            </AnimatePresence>
            <div aria-hidden className="fixed inset-0 pointer-events-none noise-mask opacity-[0.08] mix-blend-soft-light" />
        </div>
      )}
    </>
  );
};

export default App;