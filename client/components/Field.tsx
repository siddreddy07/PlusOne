import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// A label, an input, and the hint or error under it.
export function Field({
  id,
  label,
  type = "text",
  inputMode,
  autoComplete,
  value,
  onChange,
  error,
  hint,
}: {
  id: string
  label: string
  type?: string
  inputMode?: "numeric" | "text"
  autoComplete?: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-12 px-3.5 text-base md:text-base"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
