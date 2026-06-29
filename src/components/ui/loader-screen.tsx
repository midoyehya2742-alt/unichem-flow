import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoaderScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <img src="/logo-full.png" alt="UniChem" className="h-16 w-auto object-contain animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Initializing System
          </span>
        </div>
      </motion.div>
    </div>
  );
}
