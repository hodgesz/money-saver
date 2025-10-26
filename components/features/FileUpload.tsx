'use client'

// GREEN PHASE: Implement FileUpload component
import { useRef, useState } from 'react'
import { validateFile, formatFileSize } from '@/lib/utils/fileValidation'
import { Button } from '@/components/ui'

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelection = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setErrors([])
      onFileSelect(null)
      return
    }

    // Validate file
    const validation = validateFile(file)

    if (validation.valid) {
      setSelectedFile(file)
      setErrors([])
      onFileSelect(file)
    } else {
      // For invalid files, just show errors but don't call onFileSelect
      setSelectedFile(null)
      setErrors(validation.errors)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click()
  }

  const handleUploadAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      fileInputRef.current?.click()
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setErrors([])
    onFileSelect(null)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        data-testid="upload-area"
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-colors duration-200 cursor-pointer
          hover:border-blue-400 hover:bg-blue-50
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${errors.length > 0 ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
        onKeyDown={handleUploadAreaKeyDown}
        tabIndex={0}
        role="button"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx,.zip"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload transaction file"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Upload Icon */}
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              Drag and drop your file here
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </div>

          {/* Accepted formats */}
          <div className="text-sm text-gray-500">
            <p>Accepted formats: CSV, Excel (.xls, .xlsx), ZIP</p>
            <p className="mt-1">Maximum file size: 100 MB</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">
                Unable to upload file
              </p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* File Icon */}
              <svg
                className="w-8 h-8 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>

              {/* File Info */}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveFile()
              }}
              aria-label="Remove file"
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
