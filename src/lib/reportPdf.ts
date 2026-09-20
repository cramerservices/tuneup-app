import jsPDF from 'jspdf'

// Canvas PNGs carry an alpha channel that jsPDF expands into a huge raw image.
// JPEG keeps multi-page reports small enough for email, including photo reports.
export function createReportPdf(canvas: HTMLCanvasElement) {
  if (!canvas.width || !canvas.height) throw new Error('The report could not be rendered.')
  const image = canvas.toDataURL('image/jpeg', 0.85)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imageHeight = canvas.height * pageWidth / canvas.width
  const pageCount = Math.ceil(imageHeight / pageHeight)
  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage()
    pdf.addImage(image, 'JPEG', 0, -page * pageHeight, pageWidth, imageHeight, 'report')
  }
  return pdf
}
