import { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { ImageUpload } from './components/ImageUpload';
import { PatientForm } from './components/PatientForm';
import { Results } from './components/Results';
import { PatientData, ScreeningResult } from './types/screening';

type Step = 'form' | 'processing' | 'results';

/**
 * NOTE (security):
 * Do NOT ship OpenAI API keys in frontend code. Use a backend proxy.
 * This file reads VITE_OPENAI_API_KEY only for local dev/testing.
 */

function App() {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);

  // Image is expected to be a data URL (e.g., "data:image/jpeg;base64,...")
  const [imageBase64, setImageBase64] = useState<string>('');

  const [patientData, setPatientData] = useState<PatientData>({
    age: null,
    sex: 'unknown',
    cxr_view: 'unknown',
    risk_factors: {},
    bmd: { available: false },
  });

  const [result, setResult] = useState<ScreeningResult | null>(null);

  // Model selector (you can add/remove models from this list)
  // Models list reference: OpenAI models page. https://platform.openai.com/docs/models :contentReference[oaicite:0]{index=0}
  const MODEL_OPTIONS = [
    { id: 'gpt-5.2', label: 'gpt-5.2 (best overall)' }, // :contentReference[oaicite:1]{index=1}
    { id: 'gpt-5.1', label: 'gpt-5.1 (strong reasoning + consistency)' }, // :contentReference[oaicite:2]{index=2}
    { id: 'gpt-4o', label: 'gpt-4o (solid + vision)' }, // :contentReference[oaicite:3]{index=3}
    // o3 is excellent at visual reasoning, but you may prefer the Responses API for best results. :contentReference[oaicite:4]{index=4}
    { id: 'o3', label: 'o3 (reasoning + visual reasoning)' },
  ] as const;

  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[1].id);

  const handleImageSelect = (base64: string) => {
    setImageBase64(base64);
    setError(null);
  };

  const ensureDataUrl = (maybeBase64: string) => {
    if (!maybeBase64) return '';
    // If ImageUpload already returns a data URL, keep it.
    if (maybeBase64.startsWith('data:image/')) return maybeBase64;
    // Otherwise assume it's raw base64 jpeg.
    return `data:image/jpeg;base64,${maybeBase64}`;
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

  const runScreening = async () => {
    if (!validateForm()) return;

    setStep('processing');
    setError(null);

    try {
      const cleanedRiskFactors = { ...patientData.risk_factors };
      if (patientData.sex === 'male') {
        delete cleanedRiskFactors.postmenopausal;
      }

      // Payload = clinical/context inputs (the model will also receive the image separately)
      const assessmentPayload = {
        patient_age_years: patientData.age,
        sex: patientData.sex,
        cxr_view: patientData.cxr_view,
        risk_factors: cleanedRiskFactors,
        bmd: patientData.bmd,
        image_quality: 'unknown', // You can add a selector later if you want.
        note: 'Chest X-ray image is provided in the same request.',
      };

      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

      if (!openaiApiKey) {
        throw new Error(
          'Missing VITE_OPENAI_API_KEY. For production, move OpenAI calls to a backend and keep the key server-side.'
        );
      }

      const systemPrompt = `You are AiHealth OsteoFlag, a clinical decision support assistant for opportunistic osteoporosis RISK screening using chest X-ray derived signals.

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

You will be given:
- A chest X-ray image (image input)
- A JSON object with patient age/sex/view and risk factors (text input)

Task:
- Use the image to look for opportunistic bone-health cues ONLY as screening signals (e.g., suspected vertebral wedge/compression, generalized demineralization appearance, cortical thinning).
- Combine with provided clinical factors using the scoring rubric below.
- If the image is not adequate OR cues are uncertain, use screening_flag="needs_review".

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
  "screening_flag": "flag" | "no_flag" | "needs_review",
  "risk_score_0_100": number,
  "risk_band": "low" | "moderate" | "high" | "very_high",
  "urgency": "routine" | "soon" | "priority",
  "summary_one_liner": string,
  "recommendation_clinician": string,
  "patient_facing_message": string,
  "safety_disclaimer": string,
  "audit": { "inputs_used": string[], "logic_trace": string }
}

Safety disclaimer MUST include:
- This is a screening support tool, not a diagnosis.
- Confirmatory testing such as DXA may be needed.
- Clinical context and clinician judgement are required.
`;

      // IMPORTANT: Actually send the image to the model (your old code did NOT).
      // Chat Completions supports image inputs in message content. :contentReference[oaicite:5]{index=5}
      const imageDataUrl = ensureDataUrl(imageBase64);

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(assessmentPayload, null, 2),
                },
                {
                  type: 'image_url',
                  image_url: { url: imageDataUrl },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          // Structured output mode for JSON object. :contentReference[oaicite:6]{index=6}
          response_format: { type: 'json_object' },
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        throw new Error(errorData.error?.message || 'Risk assessment failed');
      }

      const openaiResult = await openaiResponse.json();
      const content = openaiResult.choices?.[0]?.message?.content || '{}';

      let assessmentResult: ScreeningResult;
      try {
        assessmentResult = JSON.parse(content);
      } catch {
        throw new Error('Model returned non-JSON output. Ensure STRICT JSON only and response_format is set.');
      }

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
          <p className="text-gray-600 mb-1">Opportunistic Osteoporosis Risk Screening</p>
          <p className="text-sm text-gray-500">Clinical decision support tool using chest X-ray analysis</p>
        </div>

        {step === 'form' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Information</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> This tool does NOT diagnose osteoporosis. It ONLY flags risk and
                  recommends confirmatory assessment when appropriate. All results require clinician review and
                  judgment.
                </p>
              </div>

              {/* Model selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Reasoning model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Tip: For best consistency with reasoning models, consider migrating to the Responses API. :contentReference[oaicite:7]{index=7}
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Screening</h2>
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
          <p className="mt-1">Clinical decision support tool - Not for diagnostic use</p>
        </div>
      </div>
    </div>
  );
}

export default App;
