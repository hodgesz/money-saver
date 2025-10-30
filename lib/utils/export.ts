/**
 * Export Utilities - Phase 2.3 Reports & Export
 * Provides CSV and PDF export functionality
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportData {
  title: string
  headers: string[]
  rows: string[][]
  metadata?: Record<string, any>
}

/**
 * Export data to CSV format
 * @param data - The data to export
 * @param filename - Optional filename for download
 * @returns CSV content as string
 */
export function exportToCSV(data: ExportData, filename?: string): string {
  // Helper function to escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape quotes by doubling them
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Build CSV content
  const lines: string[] = []

  // Add title
  lines.push(data.title)

  // Add headers
  lines.push(data.headers.map(escapeCSV).join(','))

  // Add rows
  data.rows.forEach((row) => {
    lines.push(row.map(escapeCSV).join(','))
  })

  const csvContent = lines.join('\n')

  // Trigger download if filename provided
  if (filename && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return csvContent
}

/**
 * Export data to PDF format
 * @param data - The data to export
 * @param filename - Optional filename for download
 */
export async function exportToPDF(
  data: ExportData,
  filename: string = 'report.pdf'
): Promise<void> {
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.title, 14, 20)

  // Add metadata if provided
  let yPosition = 30
  if (data.metadata) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    Object.entries(data.metadata).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPosition)
      yPosition += 6
    })
    yPosition += 4
  }

  // Add table using autoTable
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: yPosition,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: yPosition, left: 14, right: 14 },
  })

  // Save PDF if in browser environment
  if (typeof document !== 'undefined') {
    doc.save(filename)
  }
}

/**
 * Format currency for export
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Format date for export
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
