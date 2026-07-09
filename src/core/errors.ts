import type { CanvasValidationError } from './types.js'

export class CanvasValidationException extends Error {
  readonly errors: CanvasValidationError[]

  constructor(errors: CanvasValidationError[]) {
    super(formatValidationErrors(errors))
    this.name = 'CanvasValidationException'
    this.errors = errors
  }
}

export function formatValidationErrors(errors: CanvasValidationError[]): string {
  if (errors.length === 0) return 'No validation errors.'
  return errors
    .map((error) => {
      const lines = [
        `${error.severity.toUpperCase()} ${error.code}`,
        `file: ${error.file}`,
      ]
      if (error.line != null) lines.push(`line: ${error.line}`)
      if (error.component) lines.push(`component: ${error.component}`)
      if (error.prop) lines.push(`prop: ${error.prop}`)
      lines.push(`message: ${error.message}`)
      if (error.fix) lines.push(`fix: ${error.fix}`)
      return lines.join('\n')
    })
    .join('\n\n')
}
