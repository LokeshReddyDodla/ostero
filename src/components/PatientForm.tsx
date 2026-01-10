import { PatientData, RiskFactors } from '../types/screening';

interface PatientFormProps {
  data: PatientData;
  onChange: (data: PatientData) => void;
}

export function PatientForm({ data, onChange }: PatientFormProps) {
  const updateField = <K extends keyof PatientData>(field: K, value: PatientData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateRiskFactor = (factor: keyof RiskFactors, value: boolean | null) => {
    onChange({
      ...data,
      risk_factors: {
        ...data.risk_factors,
        [factor]: value,
      },
    });
  };

  const isFemale = data.sex === 'female';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Age <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="120"
            value={data.age || ''}
            onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter age"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sex <span className="text-red-500">*</span>
          </label>
          <select
            value={data.sex}
            onChange={(e) => updateField('sex', e.target.value as PatientData['sex'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="unknown">Select sex</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CXR View <span className="text-red-500">*</span>
          </label>
          <select
            value={data.cxr_view}
            onChange={(e) => updateField('cxr_view', e.target.value as PatientData['cxr_view'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="unknown">Select view</option>
            <option value="PA">PA (Posteroanterior)</option>
            <option value="AP">AP (Anteroposterior)</option>
            <option value="lateral">Lateral</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Risk Factors</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select all risk factors that apply. Leave blank if unknown.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isFemale && (
            <RiskFactorCheckbox
              label="Postmenopausal"
              value={data.risk_factors.postmenopausal}
              onChange={(v) => updateRiskFactor('postmenopausal', v)}
              highImpact
            />
          )}

          <RiskFactorCheckbox
            label="Long-term oral glucocorticoids"
            value={data.risk_factors.long_term_glucocorticoids}
            onChange={(v) => updateRiskFactor('long_term_glucocorticoids', v)}
            highImpact
          />

          <RiskFactorCheckbox
            label="Prior low-trauma fracture"
            value={data.risk_factors.prior_low_trauma_fracture}
            onChange={(v) => updateRiskFactor('prior_low_trauma_fracture', v)}
            highImpact
          />

          <RiskFactorCheckbox
            label="Rheumatoid arthritis"
            value={data.risk_factors.rheumatoid_arthritis}
            onChange={(v) => updateRiskFactor('rheumatoid_arthritis', v)}
            highImpact
          />

          <RiskFactorCheckbox
            label="Low body weight"
            value={data.risk_factors.low_body_weight}
            onChange={(v) => updateRiskFactor('low_body_weight', v)}
          />

          <RiskFactorCheckbox
            label="Current smoker"
            value={data.risk_factors.smoking}
            onChange={(v) => updateRiskFactor('smoking', v)}
          />

          <RiskFactorCheckbox
            label="Parental hip fracture"
            value={data.risk_factors.parental_hip_fracture}
            onChange={(v) => updateRiskFactor('parental_hip_fracture', v)}
          />

          <RiskFactorCheckbox
            label="Alcohol ≥3 units/day"
            value={data.risk_factors.alcohol_high}
            onChange={(v) => updateRiskFactor('alcohol_high', v)}
          />

          <RiskFactorCheckbox
            label="Secondary osteoporosis conditions"
            value={data.risk_factors.secondary_osteoporosis}
            onChange={(v) => updateRiskFactor('secondary_osteoporosis', v)}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="bmd-available"
            checked={data.bmd?.available || false}
            onChange={(e) => {
              onChange({
                ...data,
                bmd: e.target.checked
                  ? { available: true, femoral_neck_t_score: null, extraction_confidence_0_1: null }
                  : { available: false },
              });
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="bmd-available" className="text-sm font-medium text-gray-700">
            BMD/DXA data available (optional)
          </label>
        </div>

        {data.bmd?.available && (
          <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Femoral Neck T-score
              </label>
              <input
                type="number"
                step="0.1"
                value={data.bmd.femoral_neck_t_score || ''}
                onChange={(e) => {
                  onChange({
                    ...data,
                    bmd: {
                      ...data.bmd!,
                      femoral_neck_t_score: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., -2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extraction Confidence (0-1)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={data.bmd.extraction_confidence_0_1 || ''}
                onChange={(e) => {
                  onChange({
                    ...data,
                    bmd: {
                      ...data.bmd!,
                      extraction_confidence_0_1: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 0.9"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RiskFactorCheckboxProps {
  label: string;
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
  highImpact?: boolean;
}

function RiskFactorCheckbox({ label, value, onChange, highImpact }: RiskFactorCheckboxProps) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2 flex-1">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked ? true : null)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="text-sm text-gray-700 flex-1">
          {label}
          {highImpact && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
              High impact
            </span>
          )}
        </label>
      </div>
    </div>
  );
}
