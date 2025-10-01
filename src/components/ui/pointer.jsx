import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * A custom pointer component that displays a blue pointer cursor.
 * Add this as a child to any component to enable a custom pointer when hovering.
 *
 * @component
 * @param {PointerProps} props - The component props
 */
export function Pointer(
  {
    className,
    style,
    ...props
  }
) {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (typeof window !== "undefined" && containerRef.current) {
      // Get the parent element directly from the ref
      const parentElement = containerRef.current.parentElement

      if (parentElement) {
        // Add cursor-none to parent
        parentElement.style.cursor = "none"

        // Add event listeners to parent
        const handleMouseMove = (e) => {
          setX(e.clientX)
          setY(e.clientY)
        }

        const handleMouseEnter = (e) => {
          setX(e.clientX)
          setY(e.clientY)
          setIsActive(true)
        }

        const handleMouseLeave = () => {
          setIsActive(false)
        }

        parentElement.addEventListener("mousemove", handleMouseMove)
        parentElement.addEventListener("mouseenter", handleMouseEnter)
        parentElement.addEventListener("mouseleave", handleMouseLeave)

        return () => {
          parentElement.style.cursor = ""
          parentElement.removeEventListener("mousemove", handleMouseMove)
          parentElement.removeEventListener("mouseenter", handleMouseEnter)
          parentElement.removeEventListener("mouseleave", handleMouseLeave)
        };
      }
    }
  }, [])

  return (
    <>
      <div ref={containerRef} />
      {isActive && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            top: y,
            left: x,
            transform: "translate(-4px, -4px)",
            ...style,
          }}
          {...props}>
          <svg
            fill="currentColor"
            viewBox="0 0 16 16"
            height="24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("fill-blue-500", className)}
            style={{ transform: "scaleX(-1)" }}>
            <path
              d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
          </svg>
        </div>
      )}
    </>
  );
}
