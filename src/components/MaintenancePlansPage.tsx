import React, { useMemo, useState } from 'react'

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
    <div className="summary-report maintenance-plans-page" style={{ maxWidth: 980, margin: '0 auto' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-only { display: none; }

        .plans-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
        }
        .tab-btn {
          border: 1px solid rgba(0,0,0,.12);
          background: #fff;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
        }
        .tab-btn.active {
          border-color: rgba(0,0,0,.45);
          box-shadow: 0 0 0 2px rgba(0,0,0,.06);
        }
        .plans-top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .plans-callout {
          margin-top: 14px;
          padding: 14px;
          border: 1px dashed rgba(0,0,0,.25);
          border-radius: 12px;
          background: rgba(0,0,0,.02);
        }
      `}</style>

      <div className="summary-header">
        <div className="summary-header-top">
          <div>
            <h1 style={{ margin: 0 }}>Maintenance Membership Plans</h1>
            <p className="section-intro" style={{ marginTop: 6 }}>
              Want your home to run smoothly all year? Join a Maintenance Membership and keep your system performing its best.
            </p>
          </div>

          <div className="plans-top-actions no-print">
            <button className="btn btn-secondary" onClick={handlePrint}>
              Print / Save as PDF
            </button>
            <a className="btn btn-primary" href={`tel:${phoneTel}`}>
              Call {phoneDisplay}
            </a>
          </div>
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

      {/* Print: show all plans in the same style */}
      <div className="summary-section print-only">
        <h2 style={{ marginTop: 0 }}>All Plans</h2>
        {plans.map((p: Plan) => (
          <div key={p.key}>
            <PlanBody plan={p} />
          </div>
        ))}
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
