// @nimia/ui — shared shadcn/ui-style components & design tokens
// (maroon/crimson/pink brand). Hand-authored (no shadcn CLI, no Radix yet)
// per the Tahap 4 decision to minimize unverified-dependency risk while
// Next.js 16 / React 19 are this new. See docs/ARCHITECTURE.md.

export { cn } from "./lib/cn";

export { Button, buttonVariants, type ButtonProps } from "./components/Button";
export { Input, type InputProps } from "./components/Input";
export { Textarea, type TextareaProps } from "./components/Textarea";
export { Select, type SelectProps } from "./components/Select";
export { Listbox, type ListboxProps, type ListboxOption } from "./components/Listbox";
export { Label, FieldError } from "./components/Label";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/Card";
export { Modal, type ModalProps } from "./components/Modal";
