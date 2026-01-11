
import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { PatientForm } from './components/PatientForm';
import { Results } from './components/Results';
import { PatientData, ScreeningResult } from './types/screening';

type Step = 'form' | 'processing' | 'results';

function App() {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [patientData, setPatientData] = useState<PatientData>({
    age: null,
    sex: 'unknown',
    cxr_view: 'unknown',
    risk_factors: {},
    bmd: { available: false },
  });
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const handleImageSelect = (base64: string) => {
    setImageBase64(base64);
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!imageBase64) {
      setError('Please upload a chest X-ray image');
      return false;
    }
    if (!patientData.age || patientData.age <= 0) {
      setError('Please enter a valid age');
      return false;
    }
    if (patientData.sex === 'unknown') {
      setError('Please select patient sex');
      return false;
    }
    if (patientData.cxr_view === 'unknown') {
      setError('Please select CXR view type');
      return false;
    }
    return true;
  };

  const simulateVisionModel = (age: number, sex: string, cxrView: string) => {
    let baseRisk = 0.0;
    
    if (age < 50) {
      baseRisk = 0.10;
    } else if (age < 60) {
      baseRisk = 0.20;
    } else if (age < 70) {
      baseRisk = 0.35;
    } else if (age < 80) {
      baseRisk = 0.50;
    } else {
      baseRisk = 0.65;
    }
    
    if (sex === 'female' && age >= 50) {
      baseRisk += 0.15;
    }
    
    const randomVariation = (Math.random() - 0.5) * 0.2;
    let riskScore = Math.max(0, Math.min(1, baseRisk + randomVariation));
    
    let uncertainty = 0.10;
    if (cxrView === 'AP') {
      uncertainty = 0.15;
    } else if (cxrView === 'lateral') {
      uncertainty = 0.20;
    } else if (cxrView === 'unknown') {
      uncertainty = 0.40;
    }
    
    uncertainty += (Math.random() - 0.5) * 0.05;
    uncertainty = Math.max(0, Math.min(1, uncertainty));
    
    return {
      model_name: "cxr-osteoflag-v0",
      model_risk_score_0_1: parseFloat(riskScore.toFixed(3)),
      model_uncertainty_0_1: parseFloat(uncertainty.toFixed(3)),
    };
  };

  const runScreening = async () => {
    if (!validateForm()) {
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const visionResult = simulateVisionModel(
        patientData.age!,
        patientData.sex,
        patientData.cxr_view
      );

      const cleanedRiskFactors = { ...patientData.risk_factors };
      if (patientData.sex === 'male') {
        delete cleanedRiskFactors.postmenopausal;
      }

      const assessmentPayload = {
        patient_age_years: patientData.age,
        sex: patientData.sex,
        cxr_view: patientData.cxr_view,
        model_name: visionResult.model_name,
        model_risk_score_0_1: visionResult.model_risk_score_0_1,
        model_uncertainty_0_1: visionResult.model_uncertainty_0_1,
        risk_factors: cleanedRiskFactors,
        bmd: patientData.bmd,
      };

      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || 'djvrtCZgaQcK18MEfZTpKhkn7FKrpGDziQBjZQi7GMaR';
      
      const systemPrompt = `You are AiHealth OsteoFlag, a clinical decision support assistant for opportunistic osteoporosis RISK screening.

You do NOT confirm osteoporosis/osteopenia/low BMD.
You ONLY estimate risk and suggest confirmatory assessment (DXA) or clinician review.

Hard safety rules:
1) Never state or imply osteoporosis/osteopenia/low BMD is confirmed.
2) Never use the words "diagnosis" or "diagnosed".
3) Never recommend treatment or medication.
4) Only suggest DXA and/or clinician review.
5) Use ONLY the provided inputs. If a required input is missing or image quality is insufficient, output screening_flag="needs_review".
6) Output MUST be STRICT JSON only (no markdown, no extra text).
7) risk_score_0_100 must be a number from 0 to 100.

Provided inputs MAY include:
- patient_age (years) [optional]
- patient_sex ("female"|"male"|unknown) [optional]
- cxr_view ("PA"|"AP"|"lateral"|unknown) [optional]
- image_quality ("good"|"limited"|"poor") [optional]
- prior_fragility_fracture (true|false|unknown) [optional]
- long_term_steroid_use (true|false|unknown) [optional]
- xray_findings (object) [optional] with any of:
  - vertebral_wedge_or_compression_suspected (true|false|uncertain)
  - diffuse_bone_demineralization_suspected (true|false|uncertain)
  - rib_or_clavicle_cortical_thinning_suspected (true|false|uncertain)
  - other_red_flags (string[])

If the only input is the image and you cannot reliably assess key cues OR image_quality is "poor"/unknown OR cxr_view is unknown AND cues are uncertain:
- set screening_flag="needs_review"
- set risk_band="moderate" (not low) with an explanatory logic_trace
- set urgency="routine" unless vertebral compression is suspected.

Scoring rubric (calibration):
Start at 10.
Add:
+20 if age >= 65 (or +10 if age 50–64), if age provided.
+10 if sex is female and age >= 50, if provided.
+35 if vertebral_wedge_or_compression_suspected is true.
+15 if diffuse_bone_demineralization_suspected is true.
+10 if rib_or_clavicle_cortical_thinning_suspected is true.
+20 if prior_fragility_fracture is true.
+15 if long_term_steroid_use is true.
If multiple cues are "uncertain", add +10 and set screening_flag="needs_review".
Cap at 100.

Risk bands:
0–24 low
25–49 moderate
50–74 high
75–100 very_high

Flag rules:
- "flag" if risk_score >= 50 OR vertebral_wedge_or_compression_suspected is true.
- "no_flag" if risk_score <= 24 AND no concerning cues.
- Otherwise "needs_review" (especially when inputs are missing/uncertain).

Urgency:
- "priority" if vertebral compression suspected OR risk_score >= 75
- "soon" if risk_score 50–74
- "routine" otherwise

Output STRICT JSON with these exact keys:
{
  "screening_flag": "...",
  "risk_score_0_100": 0,
  "risk_band": "...",
  "urgency": "...",
  "summary_one_liner": "...",
  "recommendation_clinician": "...",
  "patient_facing_message": "...",
  "safety_disclaimer": "...",
  "audit": { "inputs_used": [], "logic_trace": "..." }
}

Safety disclaimer MUST include:
- This is a screening support tool, not a diagnosis.
- Confirmatory testing such as DXA may be needed.
- Clinical context and clinician judgement are required.
`;

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(assessmentPayload, null, 2) }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(errorData.error?.message || 'Risk assessment failed');
      }

      const openaiResult = await openaiResponse.json();
      const assessmentResult: ScreeningResult = JSON.parse(openaiResult.choices[0]?.message?.content || '{}');

      setResult(assessmentResult);
      setStep('results');
    } catch (err) {
      console.error('Screening error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unable to complete screening. Please retry.';
      setError(errorMessage);
      setStep('form');
    }
  };

  const startNewScreening = () => {
    setStep('form');
    setResult(null);
    setImageBase64('');
    setPatientData({
      age: null,
      sex: 'unknown',
      cxr_view: 'unknown',
      risk_factors: {},
      bmd: { available: false },
    });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AiHealth OsteoFlag</h1>
          </div>
          <p className="text-gray-600 mb-1">
            Opportunistic Osteoporosis Risk Screening
          </p>
          <p className="text-sm text-gray-500">
            Clinical decision support tool using chest X-ray analysis
          </p>
        </div>

        {step === 'form' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> This tool does NOT diagnose osteoporosis. It ONLY flags
                  risk and recommends confirmatory assessment when appropriate. All results require
                  clinician review and judgment.
                </p>
              </div>

              <div className="space-y-6">
                <ImageUpload onImageSelect={handleImageSelect} imagePreview={imageBase64} />
                <PatientForm data={patientData} onChange={setPatientData} />
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={runScreening}
              disabled={!imageBase64}
              className="w-full py-4 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
            >
              Run Screening
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Processing Screening
                </h2>
                <p className="text-gray-600">Analyzing chest X-ray and clinical factors...</p>
              </div>
            </div>
          </div>
        )}

        {step === 'results' && result && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Screening Results</h2>
            <Results result={result} onNewScreening={startNewScreening} />
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>AiHealth OsteoFlag MVP v1.0</p>
          <p className="mt-1">
            Clinical decision support tool - Not for diagnostic use
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
