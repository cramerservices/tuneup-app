import { InvoiceData } from './InvoiceModal'

interface InvoicePrintProps {
  customerName: string
  address: string
  inspectionDate: string
  technicianName: string
  invoiceData: InvoiceData
}

export function InvoicePrint({
  customerName,
  address,
  inspectionDate,
  technicianName,
  invoiceData
}: InvoicePrintProps) {
  const currentDate = new Date().toLocaleDateString()

  return (
    <div className="invoice-print" id="invoice-print">
      <div className="invoice-header">
        <div className="company-info">
          <img src="/CramerLogoText.png" alt="Cramer Services LLC" className="invoice-logo" />
          <div className="company-contact">
            <p className="contact-line">
              <strong>Phone:</strong> (314) 267-8594 | <strong>Email:</strong> cramerservicesllc@gmail.com
            </p>
          </div>
          <h1>HVAC Service Invoice</h1>
          <p className="invoice-date">Invoice Date: {currentDate}</p>
          <p className="service-date">Service Date: {inspectionDate}</p>
        </div>
      </div>

      <div className="invoice-details">
        <div className="invoice-section-group">
          <div className="invoice-info-box">
            <h3>Bill To:</h3>
            <p className="customer-name">{customerName}</p>
            <p>{address}</p>
          </div>

          <div className="invoice-info-box">
            <h3>Technician:</h3>
            <p>{technicianName}</p>
          </div>
        </div>
      </div>

      <div className="invoice-line-items">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.services.furnace && (
              <tr>
                <td>Furnace Tune-Up</td>
                <td className="text-right">${invoiceData.services.furnacePrice.toFixed(2)}</td>
              </tr>
            )}
            {invoiceData.services.ac && (
              <tr>
                <td>AC/Heat Pump Service</td>
                <td className="text-right">${invoiceData.services.acPrice.toFixed(2)}</td>
              </tr>
            )}
            {invoiceData.services.hot_water_tank && (
              <tr>
                <td>Hot Water Tank Service</td>
                <td className="text-right">${invoiceData.services.hotWaterPrice.toFixed(2)}</td>
              </tr>
            )}

            {invoiceData.approvedSuggestions.map((suggestion, index) => (
              <tr key={index}>
                <td>{suggestion.suggestion}</td>
                <td className="text-right">${suggestion.price.toFixed(2)}</td>
              </tr>
            ))}

            {invoiceData.additionalWork.map((work, index) => (
              <tr key={index}>
                <td>{work.description}</td>
                <td className="text-right">${work.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals-section">
          <div className="invoice-total-row">
            <span>Subtotal:</span>
            <span>${invoiceData.subtotal.toFixed(2)}</span>
          </div>
          {invoiceData.tax > 0 && (
            <div className="invoice-total-row">
              <span>Tax:</span>
              <span>${invoiceData.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="invoice-total-row invoice-total-final">
            <span>Total Amount Due:</span>
            <span>${invoiceData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="invoice-footer">
        <p>Thank you for your business!</p>
        <p className="invoice-notes">Payment is due upon receipt. Please make checks payable to [Company Name].</p>
      </div>
    </div>
  )
}
