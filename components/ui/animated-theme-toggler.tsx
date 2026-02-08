import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  const toggleTheme = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('🎨 [ThemeToggler] Button clicked!', { isDark, hasButton: !!buttonRef.current });

    if (!buttonRef.current) {
      console.error('❌ [ThemeToggler] Button ref is null');
      return;
    }

    // Check if View Transition API is supported
    if (!(document as any).startViewTransition) {
      console.warn('⚠️ [ThemeToggler] View Transition API not supported. Using fallback.');
      // Fallback: just call the parent onClick handler
      props.onClick?.(e);
      return;
    }

    console.log('✅ [ThemeToggler] View Transition API supported. Starting animation...');

    await (document as any).startViewTransition(() => {
      flushSync(() => {
        console.log('🔄 [ThemeToggler] Calling parent onClick handler...');
        // Let the parent component handle the actual theme change
        props.onClick?.(e);
      })
    }).ready

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    console.log('🎬 [ThemeToggler] Animation params:', { x, y, maxRadius });

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )

    console.log('🎉 [ThemeToggler] Animation complete!');
  }, [duration, props.onClick, isDark])

  return (
    <button
      ref={buttonRef}
      {...props}
      onClick={toggleTheme}
      className={cn(className)}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
