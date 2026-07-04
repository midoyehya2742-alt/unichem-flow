import * as React from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const GlowCard = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Card>>(
  ({ className, children, ...props }, ref) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <Card
        ref={ref}
        onMouseMove={handleMouseMove}
        className={cn(
          "group relative overflow-hidden transition-all duration-500",
          "bg-white/80 dark:bg-slate-900/90 backdrop-blur-md",
          "border border-slate-200/60 dark:border-slate-800/80",
          "hover:border-indigo-500/30 dark:hover:border-indigo-500/30",
          "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)]",
          className
        )}
        {...props}
      >
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 z-0"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                350px circle at ${mouseX}px ${mouseY}px,
                var(--glow-color, rgba(99, 102, 241, 0.06)),
                transparent 80%
              )
            `,
          }}
        />
        <div className="relative z-10 h-full w-full flex flex-col">
          {children}
        </div>
      </Card>
    );
  }
);
GlowCard.displayName = "GlowCard";

// Re-export standard card parts so they can be used with GlowCard seamlessly.
export { CardHeader as GlowCardHeader, CardFooter as GlowCardFooter, CardTitle as GlowCardTitle, CardDescription as GlowCardDescription, CardContent as GlowCardContent };
