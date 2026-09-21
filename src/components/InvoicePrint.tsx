interface Props { invoice: any; lines: any[]; customerName: string; address: string }
export function InvoicePrint({ invoice, lines, customerName, address }: Props) {
  return <section className="invoice-print" aria-label="Generated invoice">
    <h2>Invoice {invoice.invoice_number}</h2>
    <p>Cramer Services LLC · 314-267-8594</p>
    <p>{customerName}<br />{address}</p>
    <p>Invoice date: {invoice.invoice_date} · Due: {invoice.due_date}</p>
    <table className="invoice-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>
      {lines.map((line,index)=><tr key={line.id || index}><td>{line.description}</td><td>${Number(line.total_cost).toFixed(2)}</td></tr>)}
    </tbody></table>
    <p><strong>Total: ${Number(invoice.total_amount).toFixed(2)}</strong></p>
    <p>Paid: ${Number(invoice.amount_paid).toFixed(2)} · Balance due: ${Number(invoice.amount_due).toFixed(2)}</p>
  </section>
}
