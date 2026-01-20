import { useMemo, useState } from "react";


type PlanKey = 'bronze' | 'silver' | 'gold' | 'platinum' | 'minisplit'

type Plan = {
  key: PlanKey
  name: string
  badge?: string
  tagline: string
  bestFor: string[]
  includes: string[]
  memberPerks: string[]
  finePrint: string[]
}

export function MaintenancePlansPage() {
  const phoneDisplay = '(314) 267-8594'
  const phoneTel = '+13142678594'

  const plans = useMemo<Plan[]>(
    () => [
      {
        key: 'bronze',
        name: 'Bronze',
        tagline: 'Essential coverage for one HVAC system with an annual tune-up.',
        bestFor: ['Homeowners who want basic annual maintenance', 'Single-system homes wanting member discounts'],
        includes: ['Coverage for 1 HVAC system at the service address', '1 HVAC tune-up per membership year'],
        memberPerks: [
          'Priority scheduling goal: within 48 hours when reasonably possible',
          '10% off repairs and add-ons to existing systems',
          '$500 off installation of a new HVAC system performed by Cramer Services LLC',
          'Reduced service call/dispatch fee: $75 for non-tune-up issues'
        ],
        finePrint: [
          'Repairs, parts, and upgrades found during tune-ups are quoted separately unless specifically covered.',
          'Bronze does not include the $125 Service Visit Credit benefit.'
        ]
      },
      {
        key: 'silver',
        name: 'Silver',
        tagline: 'One annual tune-up plus service visit credits for eligible covered items.',
        bestFor: ['Homeowners who want an annual tune-up and small repair coverage', 'Customers who value service visit credits for eligible items'],
        includes: [
          'Coverage for 1 HVAC system at the service address',
          '1 HVAC tune-up per membership year',
          '2 complimentary service visit credits (up to $125 per visit) for eligible covered services'
        ],
        memberPerks: [
          'Priority scheduling goal: within 48 hours when reasonably possible',
          '10% off repairs and add-ons to existing systems',
          '$500 off installation of a new HVAC system performed by Cramer Services LLC'
        ],
        finePrint: [
          'Each service visit credit applies up to $125 per visit toward eligible services; customer pays any difference.',
          'Credits do not roll over and cannot be combined into one larger credit.',
          'Eligible services are defined by the Covered Services List (ask your technician).'
        ]
      },
      {
        key: 'gold',
        name: 'Gold',
        badge: 'Most Popular',
        tagline: 'Flexible tune-up coverage for one system or two systems, plus service visit credits.',
        bestFor: ['Homes with 2 HVAC systems', 'Customers wanting spring/fall tune-ups on one system'],
        includes: [
          'Choose one option:',
          'Option A: Cover 2 HVAC systems + 1 annual tune-up per system (2 total)',
          'Option B: Cover 1 HVAC system + 2 tune-ups per year',
          '2 complimentary service visit credits (up to $125 per visit) for eligible covered services'
        ],
        memberPerks: [
          'Priority scheduling goal: within 48 hours when reasonably possible',
          '10% off repairs and add-ons to existing systems',
          '$500 off installation of a new HVAC system performed by Cramer Services LLC'
        ],
        finePrint: [
          'Tune-ups are preventive maintenance; repairs and parts are quoted separately unless specifically covered.',
          'Credits do not roll over and cannot be combined into one larger credit.',
          'Eligible services are defined by the Covered Services List (ask your technician).'
        ]
      },
      {
        key: 'platinum',
        name: 'Platinum',
        tagline: 'Top-tier coverage: Gold tune-up options plus annual water heater maintenance.',
        bestFor: ['Homeowners wanting HVAC + water heater annual maintenance', 'Customers who want the broadest membership coverage'],
        includes: [
          'Choose one option:',
          'Option A: Cover 2 HVAC systems + 1 annual tune-up per system (2 total)',
          'Option B: Cover 1 HVAC system + 2 tune-ups per year',
          '1 annual water heater maintenance visit (for 1 water heater)',
          '2 complimentary service visit credits (up to $125 per visit) for eligible covered services'
        ],
        memberPerks: [
          'Priority scheduling goal: within 48 hours when reasonably possible',
          '10% off repairs and add-ons to existing systems',
          '$500 off installation of a new HVAC system performed by Cramer Services LLC'
        ],
        finePrint: [
          'Water heater repairs or replacement are quoted separately unless specifically covered.',
          'Credits do not roll over and cannot be combined into one larger credit.',
          'Eligible services are defined by the Covered Services List (ask your technician).'
        ]
      },
      {
        key: 'minisplit',
        name: 'Ductless Mini-Split',
        tagline: 'Annual maintenance for ductless systems (covers your outdoor unit + the covered head units).',
        bestFor: ['Homes with ductless mini-split systems', 'Customers who want annual performance + cleaning checks'],
        includes: [
          'Coverage for the outdoor unit serving the covered heads',
          'Coverage for the included indoor head units',
          '1 annual mini-split maintenance visit per membership year'
        ],
        memberPerks: [
          'Priority scheduling goal: within 48 hours when reasonably possible',
          '10% off repairs and add-ons to existing systems',
          '$500 off installation of a new HVAC system performed by Cramer Services LLC',
          'Reduced service call/dispatch fee: $75 for visits outside the included maintenance'
        ],
        finePrint: [
          'Deep cleaning (e.g., full blower wheel removal), repairs, and parts are quoted separately unless specifically included.',
          'Refrigerant-related work is not included unless explicitly stated.'
        ]
      }
    ],
    []
  )

  const [active, setActive] = useState<PlanKey>('gold')
  const activePlan = plans.find((p: Plan) => p.key === active) || plans[0]

  const handlePrint = () => window.print()

  const PlanBody = ({ plan }: { plan: Plan }) => (
    <div className="recommendation-card" style={{ marginTop: 12 }}>
      <div className="recommendation-header" style={{ alignItems: 'center' }}>
        <h3 className="recommendation-title" style={{ margin: 0 }}>
          {plan.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {plan.badge ? <span className="severity-badge" style={{ fontWeight: 800 }}>{plan.badge}</span> : null}
        </div>
      </div>

      <p className="recommendation-pitch" style={{ marginTop: 8 }}>
        {plan.tagline}
      </p>

      <div className="equipment-details" style={{ marginTop: 10 }}>
        <div className="equipment-detail-row">
          <div className="detail-label">Best For</div>
          <div className="detail-value">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {plan.bestFor.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="equipment-detail-row">
          <div className="detail-label">What's Included</div>
          <div className="detail-value">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {plan.includes.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="equipment-detail-row">
          <div className="detail-label">Member Perks</div>
          <div className="detail-value">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {plan.memberPerks.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="equipment-detail-row">
          <div className="detail-label">Notes</div>
          <div className="detail-value">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {plan.finePrint.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="summary-report maintenance-plans-page" style={{ maxWidth: 1040, margin: '0 auto' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .plan-page-break {
            page-break-after: always;
            break-after: page;
          }
          .plan-page-break:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
        .print-only { display: none; }

        .maintenance-plans-page {
          background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);
          min-height: 100vh;
          padding: 32px 24px;
        }

        .plans-hero {
          text-align: center;
          margin-bottom: 48px;
        }

        .plans-hero h1 {
          font-size: 42px;
          font-weight: 900;
          color: #1e293b;
          margin: 0 0 16px 0;
          letter-spacing: -0.02em;
        }

        .plans-hero p {
          font-size: 18px;
          color: #64748b;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .plans-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin: 32px 0;
          padding: 0 16px;
        }

        .tab-btn {
          border: 2px solid #e2e8f0;
          background: #ffffff;
          border-radius: 12px;
          padding: 14px 24px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #475569;
          position: relative;
          overflow: hidden;
        }

        .tab-btn:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .tab-btn.active {
          border-color: #0ea5e9;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
        }

        .tab-btn.active::before {
          content: '✓ ';
          font-weight: 900;
        }

        .plans-top-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 24px;
        }

        .plans-top-actions .btn {
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .plans-top-actions .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .plans-callout {
          margin-top: 32px;
          padding: 24px;
          border: 2px solid #bfdbfe;
          border-radius: 16px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        .plans-callout strong {
          color: #1e40af;
          font-size: 16px;
        }

        .plans-callout a {
          color: #1e40af;
          font-weight: 900;
          text-decoration: underline;
        }

        .recommendation-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .recommendation-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          transform: translateY(-4px);
        }

        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }

        .recommendation-title {
          font-size: 28px;
          font-weight: 900;
          color: #1e293b;
          letter-spacing: -0.01em;
        }

        .severity-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .recommendation-pitch {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
          margin-top: 16px;
        }

        .equipment-details {
          margin-top: 24px;
        }

        .equipment-detail-row {
          padding: 16px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .equipment-detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 800;
          color: #1e293b;
          font-size: 15px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          color: #475569;
          line-height: 1.7;
        }

        .detail-value ul {
          margin: 0;
          padding-left: 24px;
        }

        .detail-value li {
          margin-bottom: 8px;
          padding-left: 4px;
        }

        .detail-value li::marker {
          color: #0ea5e9;
          font-weight: bold;
        }

        .plan-page-break {
          margin-bottom: 24px;
        }

        @media print {
          .maintenance-plans-page {
            background: white;
            padding: 0;
          }

          .recommendation-card {
            box-shadow: none;
            border: 1px solid #e2e8f0;
            margin: 0;
          }
        }
      `}</style>

      <div className="plans-hero no-print">
        <h1>Maintenance Membership Plans</h1>
        <p>
          Keep your home running smoothly all year with professional maintenance and exclusive member benefits.
        </p>
        <div className="plans-top-actions">
          <button className="btn btn-secondary" onClick={handlePrint}>
            Print / Save as PDF
          </button>
          <a className="btn btn-primary" href={`tel:${phoneTel}`}>
            Call {phoneDisplay}
          </a>
        </div>
      </div>

      <div className="summary-section no-print">
        <div className="section-header-with-toggle">
          <h2 style={{ margin: 0 }}>Choose a Plan</h2>
        </div>

        <div className="plans-tabs" role="tablist" aria-label="Membership plan tabs">
          {plans.map((p: Plan) => (
            <button
              key={p.key}
              className={`tab-btn ${p.key === active ? 'active' : ''}`}
              onClick={() => setActive(p.key)}
              role="tab"
              aria-selected={p.key === active}
            >
              {p.name}
              {p.badge ? ` • ${p.badge}` : ''}
            </button>
          ))}
        </div>

        <PlanBody plan={activePlan} />
      </div>

      {/* Print: show all plans with page breaks */}
      <div className="print-only">
        {plans.map((p: Plan) => (
          <div key={p.key} className="plan-page-break">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', margin: '0 0 8px 0' }}>
                Maintenance Membership Plans
              </h1>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Professional maintenance and exclusive member benefits for your home
              </p>
            </div>
            <PlanBody plan={p} />
          </div>
        ))}
        <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            For more information, call <strong style={{ color: '#1e293b' }}>{phoneDisplay}</strong>
          </p>
        </div>
      </div>

      <div className="summary-section">
        <div className="plans-callout">
          <strong>If these plans don't match what you need:</strong> talk to your technician or call{' '}
          <a href={`tel:${phoneTel}`} style={{ fontWeight: 900, textDecoration: 'underline' }}>
            {phoneDisplay}
          </a>{' '}
          to build a custom plan.
        </div>

        <p style={{ marginTop: 12, color: '#6b7280', fontSize: 12 }}>
          Coverage details, exclusions, and eligibility are subject to your signed agreement. Non-covered repairs, specialty materials,
          permits, and third-party fees are not included unless specifically stated.
        </p>
      </div>
    </div>
  )
}
