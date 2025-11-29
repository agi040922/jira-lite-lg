"use client"

import React from "react"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { askClaude } from "@/app/test/morph-panel/actions"

interface OrbProps {
  dimension?: string
  className?: string
  tones?: {
    base?: string
    accent1?: string
    accent2?: string
    accent3?: string
  }
  spinDuration?: number
}

const ColorOrb: React.FC<OrbProps> = ({
  dimension = "192px",
  className,
  tones,
  spinDuration = 20,
}) => {
  const fallbackTones = {
    base: "oklch(95% 0.02 264.695)",
    accent1: "oklch(75% 0.15 350)",
    accent2: "oklch(80% 0.12 200)",
    accent3: "oklch(78% 0.14 280)",
  }

  const palette = { ...fallbackTones, ...tones }

  const dimValue = parseInt(dimension.replace("px", ""), 10)

  const blurStrength =
    dimValue < 50 ? Math.max(dimValue * 0.008, 1) : Math.max(dimValue * 0.015, 4)

  const contrastStrength =
    dimValue < 50 ? Math.max(dimValue * 0.004, 1.2) : Math.max(dimValue * 0.008, 1.5)

  const pixelDot = dimValue < 50 ? Math.max(dimValue * 0.004, 0.05) : Math.max(dimValue * 0.008, 0.1)

  const shadowRange = dimValue < 50 ? Math.max(dimValue * 0.004, 0.5) : Math.max(dimValue * 0.008, 2)

  const maskRadius =
    dimValue < 30 ? "0%" : dimValue < 50 ? "5%" : dimValue < 100 ? "15%" : "25%"

  const adjustedContrast =
    dimValue < 30 ? 1.1 : dimValue < 50 ? Math.max(contrastStrength * 1.2, 1.3) : contrastStrength

  return (
    <div
      className={cn("color-orb", className)}
      style={{
        width: dimension,
        height: dimension,
        "--base": palette.base,
        "--accent1": palette.accent1,
        "--accent2": palette.accent2,
        "--accent3": palette.accent3,
        "--spin-duration": `${spinDuration}s`,
        "--blur": `${blurStrength}px`,
        "--contrast": adjustedContrast,
        "--dot": `${pixelDot}px`,
        "--shadow": `${shadowRange}px`,
        "--mask": maskRadius,
      } as React.CSSProperties}
    >
      <style jsx>{`
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .color-orb {
          display: grid;
          grid-template-areas: "stack";
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          transform: scale(1.1);
        }

        .color-orb::before,
        .color-orb::after {
          content: "";
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          transform: translateZ(0);
        }

        .color-orb::before {
          background:
            conic-gradient(
              from calc(var(--angle) * 2) at 25% 70%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 45% 75%,
              var(--accent2),
              transparent 30% 60%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * -3) at 80% 20%,
              var(--accent1),
              transparent 40% 60%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * 2) at 15% 5%,
              var(--accent2),
              transparent 10% 90%,
              var(--accent2)
            ),
            conic-gradient(
              from calc(var(--angle) * 1) at 20% 80%,
              var(--accent1),
              transparent 10% 90%,
              var(--accent1)
            ),
            conic-gradient(
              from calc(var(--angle) * -2) at 85% 10%,
              var(--accent3),
              transparent 20% 80%,
              var(--accent3)
            );
          box-shadow: inset var(--base) 0 0 var(--shadow) calc(var(--shadow) * 0.2);
          filter: blur(var(--blur)) contrast(var(--contrast));
          animation: spin var(--spin-duration) linear infinite;
        }

        .color-orb::after {
          background-image: radial-gradient(
            circle at center,
            var(--base) var(--dot),
            transparent var(--dot)
          );
          background-size: calc(var(--dot) * 2) calc(var(--dot) * 2);
          backdrop-filter: blur(calc(var(--blur) * 2)) contrast(calc(var(--contrast) * 2));
          mix-blend-mode: overlay;
        }

        .color-orb[style*="--mask: 0%"]::after {
          mask-image: none;
        }

        .color-orb:not([style*="--mask: 0%"])::after {
          mask-image: radial-gradient(black var(--mask), transparent 75%);
        }

        @keyframes spin {
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .color-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

const SPEED_FACTOR = 1

interface ContextShape {
  showForm: boolean
  successFlag: boolean
  triggerOpen: () => void
  triggerClose: () => void
  isLoading: boolean
  response: string | null
  handleSubmit: (message: string) => Promise<void>
  resetResponse: () => void
}

const FormContext = React.createContext({} as ContextShape)
const useFormContext = () => React.useContext(FormContext)

export function MorphPanel() {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const [showForm, setShowForm] = React.useState(false)
  const [successFlag, setSuccessFlag] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [response, setResponse] = React.useState<string | null>(null)

  const triggerClose = React.useCallback(() => {
    setShowForm(false)
    textareaRef.current?.blur()
    // Don't reset response immediately to allow reading
  }, [])

  const triggerOpen = React.useCallback(() => {
    setShowForm(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const handleSuccess = React.useCallback(() => {
    // triggerClose() // Don't close immediately, show response
    setSuccessFlag(true)
    setTimeout(() => setSuccessFlag(false), 1500)
  }, [])

  const handleSubmit = React.useCallback(async (message: string) => {
    setIsLoading(true)
    setResponse(null)
    try {
      const result = await askClaude(message)
      if (result.success) {
        setResponse(result.message)
        handleSuccess()
      } else {
        setResponse("Error: " + result.message)
      }
    } catch (e) {
      setResponse("An error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [handleSuccess])

  const resetResponse = React.useCallback(() => {
    setResponse(null)
    setTimeout(() => {
        textareaRef.current?.focus()
    })
  }, [])

  React.useEffect(() => {
    function clickOutsideHandler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && showForm) {
        triggerClose()
      }
    }
    document.addEventListener("mousedown", clickOutsideHandler)
    return () => document.removeEventListener("mousedown", clickOutsideHandler)
  }, [showForm, triggerClose])

  const ctx = React.useMemo(
    () => ({ showForm, successFlag, triggerOpen, triggerClose, isLoading, response, handleSubmit, resetResponse }),
    [showForm, successFlag, triggerOpen, triggerClose, isLoading, response, handleSubmit, resetResponse]
  )

  const panelHeight = response ? "auto" : showForm ? FORM_HEIGHT : 44
  const panelWidth = response ? 500 : showForm ? FORM_WIDTH : "auto"

  return (
    <div className="flex items-center justify-center" style={{ width: response ? 500 : FORM_WIDTH, height: response ? "auto" : FORM_HEIGHT, transition: "width 0.3s, height 0.3s" }}>
      <motion.div
        ref={wrapperRef}
        data-panel
        className={cx(
          "bg-background relative bottom-8 z-3 flex flex-col items-center overflow-hidden border max-sm:bottom-5"
        )}
        initial={false}
        animate={{
          width: panelWidth,
          height: panelHeight,
          borderRadius: showForm ? 14 : 20,
        }}
        transition={{
          type: "spring",
          stiffness: 550 / SPEED_FACTOR,
          damping: 45,
          mass: 0.7,
          delay: showForm ? 0 : 0.08,
        }}
      >
        <FormContext.Provider value={ctx}>
          <DockBar />
          <InputForm ref={textareaRef} />
          <ResponseView />
        </FormContext.Provider>
      </motion.div>
    </div>
  )
}

function DockBar() {
  const { showForm, triggerOpen, isLoading } = useFormContext()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none w-full">
      <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2 w-full">
        <div className="flex w-fit items-center gap-2">
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div
                key="blank"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                className="h-5 w-5"
              />
            ) : (
              <motion.div
                key="orb"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ColorOrb dimension="24px" tones={{ base: "oklch(22.64% 0 0)" }} spinDuration={isLoading ? 2 : 20} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          className="flex h-fit flex-1 justify-end rounded-full px-2 !py-0.5"
          variant="ghost"
          onClick={triggerOpen}
        >
          <span className="truncate">Ask AI</span>
        </Button>
      </div>
    </footer>
  )
}

const FORM_WIDTH = 360
const FORM_HEIGHT = 200

function InputForm({ ref }: { ref: React.Ref<HTMLTextAreaElement> }) {
  const { triggerClose, showForm, handleSubmit, isLoading, response } = useFormContext()
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const [message, setMessage] = React.useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!message.trim()) return
    await handleSubmit(message)
    setMessage("")
  }

  function handleKeys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") triggerClose()
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      btnRef.current?.click()
    }
  }

  if (response) return null

  return (
    <form
      onSubmit={onSubmit}
      className="absolute bottom-0"
      style={{ width: FORM_WIDTH, height: FORM_HEIGHT, pointerEvents: showForm ? "all" : "none" }}
    >
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 550 / SPEED_FACTOR, damping: 45, mass: 0.7 }}
            className="flex h-full flex-col p-1"
          >
            <div className="flex justify-between py-1">
              <p className="text-foreground z-2 ml-[38px] flex items-center gap-[6px] select-none">
                AI Input
              </p>
              <button
                type="submit"
                ref={btnRef}
                disabled={isLoading}
                className="text-foreground right-4 mt-1 flex -translate-y-[3px] cursor-pointer items-center justify-center gap-1 rounded-[12px] bg-transparent pr-1 text-center select-none disabled:opacity-50"
              >
                <KeyHint>⌘</KeyHint>
                <KeyHint className="w-fit">Enter</KeyHint>
              </button>
            </div>
            <textarea
              ref={ref}
              placeholder={isLoading ? "Thinking..." : "Ask me anything..."}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-full w-full resize-none scroll-py-2 rounded-md p-4 outline-0 disabled:opacity-50"
              required
              onKeyDown={handleKeys}
              spellCheck={false}
              disabled={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-2 left-3"
          >
            <ColorOrb dimension="24px" tones={{ base: "oklch(22.64% 0 0)" }} spinDuration={isLoading ? 2 : 20} />
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Copy, Check } from "lucide-react"

function ResponseView() {
    const { response, resetResponse } = useFormContext()
    const [isCopied, setIsCopied] = React.useState(false)

    if (!response) return null

    let isJson = false
    let formattedJson = ""
    let displayContent = response

    try {
        // Try to parse the raw response first
        let jsonString = response
        
        // Check for markdown code blocks
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
        const match = response.match(codeBlockRegex)
        if (match) {
            jsonString = match[1]
        }

        const parsed = JSON.parse(jsonString)
        formattedJson = JSON.stringify(parsed, null, 2)
        isJson = true
        displayContent = formattedJson
    } catch (e) {
        // Not JSON
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(displayContent)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 w-full flex flex-col gap-4"
        >
            <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                    <ColorOrb dimension="32px" tones={{ base: "oklch(22.64% 0 0)" }} />
                    <h3 className="font-semibold">Claude Response</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto rounded-md">
                {isJson ? (
                    <SyntaxHighlighter
                        language="json"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, borderRadius: "0.375rem", fontSize: "0.875rem" }}
                    >
                        {formattedJson}
                    </SyntaxHighlighter>
                ) : (
                    <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{response}</p>
                    </div>
                )}
            </div>

            <Button onClick={resetResponse} className="self-end">
                Ask Another
            </Button>
        </motion.div>
    )
}

const SPRING_LOGO = { type: "spring", stiffness: 350 / SPEED_FACTOR, damping: 35 } as const

function KeyHint({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cx(
        "text-foreground flex h-6 w-fit items-center justify-center rounded-sm border px-[6px] font-sans",
        className
      )}
    >
      {children}
    </kbd>
  )
}

export default MorphPanel
