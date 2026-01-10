import { ScreeningResult } from '../types/screening';
import { AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ResultsProps {
  result: ScreeningResult;
  onNewScreening: () => void;
}

export function Results({ result, onNewScreening }: ResultsProps) {
  const getFlagIcon = () => {
    switch (result.screening_flag) {
      case 'flag':
        return <AlertTriangle className="w-8 h-8" />;
      case 'needs_review':
        return <AlertCircle className="w-8 h-8" />;
      default:
        return <CheckCircle className="w-8 h-8" />;
    }
  };

  const getFlagColor = () => {
    switch (result.screening_flag) {
      case 'flag':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'needs_review':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-green-50 border-green-200 text-green-900';
    }
  };

  const getRiskBandColor = () => {
    switch (result.risk_band) {
      case 'very_high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getUrgencyColor = () => {
    switch (result.urgency) {
      case 'priority':
        return 'bg-red-600 text-white';
      case 'soon':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const formatRiskBand = (band: string) => {
    return band
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatUrgency = (urgency: string) => {
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className={`border-2 rounded-lg p-6 ${getFlagColor()}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">{getFlagIcon()}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">
              {result.screening_flag === 'flag'
                ? 'Risk Flag Detected'
                : result.screening_flag === 'needs_review'
                ? 'Manual Review Required'
                : 'No Flag Detected'}
            </h2>
            <p className="text-base">{result.summary_one_liner}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">Risk Score</div>
          <div className="text-3xl font-bold text-gray-900">{result.risk_score_0_100}</div>
          <div className="text-sm text-gray-500">out of 100</div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">Risk Band</div>
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRiskBandColor()}`}
          >
            {formatRiskBand(result.risk_band)}
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-1">Urgency</div>
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor()}`}
          >
            {formatUrgency(result.urgency)}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Clinician Recommendation
            </h3>
            <p className="text-blue-900 whitespace-pre-wrap">{result.recommendation_clinician}</p>
          </div>
        </div>
      </div>

      {result.patient_facing_message && (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient-Facing Message</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{result.patient_facing_message}</p>
        </div>
      )}

      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Safety Disclaimer</h3>
            <p className="text-red-900 text-sm whitespace-pre-wrap">{result.safety_disclaimer}</p>
          </div>
        </div>
      </div>

      <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
          Audit Trail
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Inputs Used:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.audit.inputs_used.map((input, idx) => (
                <li key={idx}>{input}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Logic Trace:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.audit.logic_trace}</p>
          </div>
        </div>
      </details>

      <button
        onClick={onNewScreening}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start New Screening
      </button>
    </div>
  );
}
