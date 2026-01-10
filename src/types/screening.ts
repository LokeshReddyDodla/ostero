export interface RiskFactors {
  postmenopausal?: boolean | null;
  long_term_glucocorticoids?: boolean | null;
  prior_low_trauma_fracture?: boolean | null;
  rheumatoid_arthritis?: boolean | null;
  low_body_weight?: boolean | null;
  smoking?: boolean | null;
  parental_hip_fracture?: boolean | null;
  alcohol_high?: boolean | null;
  secondary_osteoporosis?: boolean | null;
}

export interface BMDData {
  available: boolean;
  femoral_neck_t_score?: number | null;
  extraction_confidence_0_1?: number | null;
}

export interface PatientData {
  age: number | null;
  sex: 'female' | 'male' | 'other' | 'unknown';
  cxr_view: 'PA' | 'AP' | 'lateral' | 'unknown';
  risk_factors: RiskFactors;
  bmd?: BMDData;
}

export interface VisionModelOutput {
  model_name: string;
  model_risk_score_0_1: number;
  model_uncertainty_0_1: number;
}

export interface ScreeningResult {
  screening_flag: 'flag' | 'no_flag' | 'needs_review';
  risk_score_0_100: number;
  risk_band: 'low' | 'moderate' | 'high' | 'very_high';
  urgency: 'routine' | 'soon' | 'priority';
  summary_one_liner: string;
  recommendation_clinician: string;
  patient_facing_message: string;
  safety_disclaimer: string;
  audit: {
    inputs_used: string[];
    logic_trace: string;
  };
}

export interface Screening {
  id: string;
  created_at: string;
  patient_age_years: number;
  sex: string;
  cxr_view: string;
  model_risk_score: number;
  model_uncertainty: number;
  final_risk_score: number;
  risk_band: string;
  screening_flag: string;
  urgency: string;
  summary_one_liner: string;
  recommendation_clinician: string;
  patient_facing_message: string;
  safety_disclaimer: string;
  status: string;
}
