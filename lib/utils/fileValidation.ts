// GREEN PHASE: Implement file validation

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Maximum file size: 10MB (as per PRD requirements)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Accepted file types
export const ACCEPTED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]

// Accepted file extensions (fallback when MIME type is generic)
const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

/**
 * Validates a file for upload
 * @param file - File to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validateFile(file: File): ValidationResult {
  const errors: string[] = []

  // Check if file exists
  if (!file) {
    return {
      valid: false,
      errors: ['No file provided'],
    }
  }

  // Check if file has a name
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required')
  }

  // Validate file type
  const isValidType = validateFileType(file)
  if (!isValidType) {
    errors.push('File type not supported. Please upload a CSV or Excel file.')
  }

  // Validate file size
  const isValidSize = validateFileSize(file)
  if (!isValidSize) {
    errors.push('File size exceeds 10MB limit')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates file type by checking MIME type and extension
 */
function validateFileType(file: File): boolean {
  // Check MIME type first
  if (ACCEPTED_FILE_TYPES.includes(file.type)) {
    return true
  }

  // Fallback: Check file extension for generic MIME types
  const fileName = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

/**
 * Validates file size
 */
function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
