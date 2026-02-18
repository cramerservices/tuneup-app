import { useState } from 'react';

type ServiceType = 'furnace' | 'heat_pump' | 'mini_split' | 'hot_water_tank';

const SERVICES: { id: ServiceType; label: string; icon: string }[] = [
  { id: 'furnace',        label: 'Furnace Tune Up', icon: '🔥' },
  { id: 'heat_pump',      label: 'AC/Heat Pump',    icon: '❄️' },
  { id: 'mini_split',     label: 'Mini Split',      icon: '🌀' },
  { id: 'hot_water_tank', label: 'Hot Water Tank',  icon: '💧' },
];

interface ServiceSelectionProps {
  onContinue: (serviceTypes: string[]) => void;
  onViewSavedInspections: () => void;
}

export default function ServiceSelection({
  onContinue,
  onViewSavedInspections,
}: ServiceSelectionProps) {
  const [selected, setSelected] = useState<ServiceType[]>([]);

  const toggle = (id: ServiceType) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canContinue = selected.length > 0;

  return (
    <div className="service-selection">
      <div className="service-selection-header">
        <h1>Select Service Type</h1>
        <p>Choose what you’re servicing so your checklist matches the job.</p>

        {/* Saved Inspections button */}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onViewSavedInspections}
          >
            View Saved Inspections
          </button>
        </div>
      </div>

      <div className="service-cards">
        {SERVICES.map((s) => {
          const isSelected = selected.includes(s.id);
          return (
            <div
              key={s.id}
              className={`service-card ${isSelected ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => toggle(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(s.id);
                }
              }}
            >
              <div className="service-checkbox">
                {isSelected ? <span className="checkmark">✓</span> : null}
              </div>

              <div className="service-icon">{s.icon}</div>
              <div className="service-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="service-selection-footer">
        <button
          type="button"
          className="btn btn-primary btn-large"
          disabled={!canContinue}
          onClick={() => onContinue(selected)}
        >
          Continue to Inspection
        </button>
      </div>
    </div>
  );
}

