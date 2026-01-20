import { useMemo, useState } from 'react'

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

  const plans = useMemo<Plan[]>(() => ([
    {
      key: 'bronze',
      name: 'Bronze',
      tagline: 'Essential coverage for one HVAC system with an annual tune-up.',
      bestFor: [
        'Homeowners who want basic annual maintenance',
        'Single-system homes wanting member discounts'
      ],
      includes: [
        'Coverage for 1 HVAC system at the service address',
        '1 HVAC tune-up per membership year'
      ],
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
      bestFor: [
        'Homeowners who want an annual tune-up and small repair coverage',
        'Customers who value service visit credits for eligible items'
      ],
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
      bestFor: [
        'Homes with 2 HVAC systems',
        'Customers wanting spring/fall tune-ups on one system'
      ],
      includes: [
        'Choose one option:',
        '- Option A: Cover 2 HVAC systems + 1 annual tune-up per system (2 total)',
        '- Option B: Cover 1 HVAC system + 2 tune-ups per year',
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
      bestFor: [
        'Homeowners wanting HVAC + water heater annual maintenance',
        'Customers who want the broadest membership coverage'
      ],
      includes: [
        'Choose one option:',
        '- Option A: Cover 2 HVAC systems + 1 annual tune-up per system (2 total)',
        '- Option B: Cover 1 HVAC system + 2 tune-ups per year',
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
      bestFor: [
        'Homes with ductless mini-split systems',
        'Customers who want annual performance + cleaning checks'
      ],
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
  ]), [])

  const [active, setActive] = useState<PlanKey>('gold')

  const activePlan = plans.find(p => p.key === active) || plans[0]

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="maintenance-plans-page" style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .tabs-row { display:flex; flex-wrap:wrap; gap:8px; margin: 14px 0 18px; }
        .tab-btn { border: 1px solid #e5e7eb; background:#fff; padding:10px 12px; border-radius: 12px; cursor:pointer; font-weight: 700; }
        .tab-btn.active { border-color:#111827; }
        .plan-card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; background: #fff; }
        .pill { display:inline-block; padding: 6px 10px; border-radius: 999px; border: 1px solid #e5e7eb; font-size: 12px; font-weight: 800; }
        .section-title { margin: 16px 0 8px; font-size: 14px; font-weight: 900; letter-spacing: .02em; text-transform: uppercase; }
        .bullets { margin: 0; padding-left: 18px; }
        .bullets li { margin: 6px 0; }
        .topbar { display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; flex-wrap: wrap; }
        .headline { margin: 0; font-size: 28px; font-weight: 900; }
        .sub { margin: 6px 0 0; color:#374151; }
        .actions { display:flex; gap: 10px; flex-wrap:wrap; }
        .btn { display:inline-flex; align-items:center; justify-content:center; padding: 10px 14px; border-radius: 12px; border: 1px solid #111827; background:#111827; color:#fff; font-weight: 800; text-decoration:none; cursor:pointer; }
        .btn.secondary { background:#fff; color:#111827; }
        .callout { margin-top: 18px; border: 1px dashed #9ca3af; border-radius: 16px; padding: 14px; background: #fafafa; }
      `}</style>

      <div className="topbar">
        <div>
          <h1 className="headline">Cramer Services Membership Plans</h1>
          <p className="sub">Tap a plan to see what's included. Use the button to save/print this page as a PDF.</p>
        </div>

        <div className="actions no-print">
          <button className="btn secondary" onClick={handlePrint}>Print / Save as PDF</button>
          <a className="btn" href={`tel:${phoneTel}`}>Call {phoneDisplay}</a>
        </div>
      </div>

      <div className="tabs-row no-print" role="tablist" aria-label="Membership plan tabs">
        {plans.map((p) => (
          <button
            key={p.key}
            className={`tab-btn ${p.key === active ? 'active' : ''}`}
            onClick={() => setActive(p.key)}
            role="tab"
            aria-selected={p.key === active}
          >
            {p.name}{p.badge ? ` - ${p.badge}` : ''}
          </button>
        ))}
      </div>

      <div className="plan-card" role="tabpanel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{activePlan.name}</h2>
          {activePlan.badge && <span className="pill">{activePlan.badge}</span>}
        </div>
        <p style={{ marginTop: 8, marginBottom: 0, color: '#374151' }}>{activePlan.tagline}</p>

        <div className="section-title">Best for</div>
        <ul className="bullets">
          {activePlan.bestFor.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div className="section-title">What's included</div>
        <ul className="bullets">
          {activePlan.includes.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div className="section-title">Member perks</div>
        <ul className="bullets">
          {activePlan.memberPerks.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <div className="section-title">Notes</div>
        <ul className="bullets">
          {activePlan.finePrint.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      <div className="callout">
        <strong>If these plans don't match what you need:</strong> talk to your technician or call{' '}
        <a href={`tel:${phoneTel}`} style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 900 }}>{phoneDisplay}</a>{' '}
        to build a custom plan.
      </div>

      <p style={{ marginTop: 14, color: '#6b7280', fontSize: 12 }}>
        Coverage details, exclusions, and eligibility are subject to your signed agreement. Non-covered repairs, specialty materials,
        permits, and third-party fees are not included unless specifically stated.
      </p>
    </div>
  )
}
