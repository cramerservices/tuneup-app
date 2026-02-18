import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Inspection {
  id: string
  customer_name: string
  address: string
  technician_name: string
  inspection_date: string
  created_at: string
  updated_at: string
}

interface SavedInspectionsProps {
  onLoadInspection: (inspectionId: string) => void
  onNewInspection: () => void
}

export function SavedInspections({ onLoadInspection, onNewInspection }: SavedInspectionsProps) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadInspections()
  }, [])

  const loadInspections = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setInspections(data || [])
    } catch (err) {
      console.error('Error loading inspections:', err)
      setError('Failed to load inspections. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inspection? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)

    try {
      const { error: deleteError } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setInspections(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Error deleting inspection:', err)
      alert('Failed to delete inspection. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
      const handleBack = () => {
    if (window.history.length > 1) window.history.back()
    else onNewInspection()
  }

    return (
      <div className="saved-inspections-page">
        <div className="loading-message">Loading inspections...</div>
      </div>
    )
  }

  return (
    <div className="saved-inspections-page">
      <style>{`
        .saved-inspections-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-header h1 {
          font-size: 32px;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
        }

        .loading-message, .error-message, .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #64748b;
          font-size: 16px;
        }

        .error-message {
          color: #ef4444;
        }

        .empty-state {
          background: #f8fafc;
          border-radius: 16px;
          border: 2px dashed #cbd5e1;
        }

        .empty-state h2 {
          color: #1e293b;
          font-size: 24px;
          margin-bottom: 12px;
        }

        .inspections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .inspection-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .inspection-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-4px);
        }

        .inspection-header {
          margin-bottom: 16px;
        }

        .customer-name {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .inspection-address {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .inspection-details {
          flex: 1;
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: #64748b;
          font-weight: 600;
        }

        .detail-value {
          color: #1e293b;
          font-weight: 700;
        }

        .inspection-actions {
          display: flex;
          gap: 8px;
        }

        .saved-inspections-page .btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .saved-inspections-page .btn-primary {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          color: white;
        }

        .saved-inspections-page .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }

        .saved-inspections-page .btn-danger {
          background: #ef4444;
          color: white;
        }

        .saved-inspections-page .btn-danger:hover {
          background: #dc2626;
          transform: translateY(-2px);
        }

        .saved-inspections-page .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .saved-inspections-page .btn-success {
          background: #10b981;
          color: white;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .saved-inspections-page .btn-success:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .timestamps {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

      `}</style>

<div className="page-header">
  <h1>Saved Inspections</h1>

  <div className="header-actions">
    <button onClick={handleBack} className="btn-primary" type="button">
      ← Back
    </button>

    <button onClick={onNewInspection} className="btn-success" type="button">
      + New Inspection
    </button>
  </div>
</div>



      {error && <div className="error-message">{error}</div>}

      {!error && inspections.length === 0 && (
        <div className="empty-state">
          <h2>No Saved Inspections</h2>
          <p>Start by creating your first inspection</p>
          <button onClick={onNewInspection} className="btn-success" style={{ marginTop: 16 }}>
            Create New Inspection
          </button>
        </div>
      )}

      {!error && inspections.length > 0 && (
        <div className="inspections-grid">
          {inspections.map((inspection) => (
            <div key={inspection.id} className="inspection-card">
              <div className="inspection-header">
                <h3 className="customer-name">{inspection.customer_name || 'Unnamed Customer'}</h3>
                <div className="inspection-address">{inspection.address || 'No address provided'}</div>
              </div>

              <div className="inspection-details">
                <div className="detail-row">
                  <span className="detail-label">Technician:</span>
                  <span className="detail-value">{inspection.technician_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Inspection Date:</span>
                  <span className="detail-value">{formatDate(inspection.inspection_date)}</span>
                </div>
                <div className="timestamps">
                  Created: {formatDate(inspection.created_at)}
                </div>
              </div>

              <div className="inspection-actions">
                <button
                  onClick={() => onLoadInspection(inspection.id)}
                  className="btn btn-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(inspection.id)}
                  className="btn btn-danger"
                  disabled={deletingId === inspection.id}
                >
                  {deletingId === inspection.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
