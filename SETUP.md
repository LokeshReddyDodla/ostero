# AiHealth OsteoFlag Setup Instructions

## OpenAI API Key Configuration

The risk assessment edge function requires an OpenAI API key to function properly.

### Steps to Configure:

1. **Get your OpenAI API Key:**
   - Go to https://platform.openai.com/account/api-keys
   - Create a new API key or copy an existing one
   - Make sure your account has access to GPT-4o model

2. **Configure the API Key in Supabase:**
   - Go to your Supabase dashboard: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **Settings** → **Edge Functions** → **Secrets**
   - Add a new secret:
     - Name: `OPENAI_API_KEY`
     - Value: Your OpenAI API key (starts with `sk-...`)
   - Click **Save**

3. **Redeploy the Edge Function (if needed):**
   The risk-assessment function should automatically pick up the new environment variable.
   If it doesn't work immediately, the function may need to be redeployed.

### Alternative: Use a Fallback Implementation

If you prefer not to use the OpenAI API, you can implement a deterministic rule-based risk assessment instead. Let me know if you'd like me to create that version.

## Testing the Application

Once the API key is configured:

1. Upload a chest X-ray image (any medical X-ray image for testing)
2. Enter patient demographics:
   - Age (required)
   - Sex (required)
   - CXR view type (required)
3. Select applicable clinical risk factors
4. Optionally add BMD/DXA data
5. Click "Run Screening"

The system will:
- Process the image through the vision model simulator
- Send data to GPT-4o for risk assessment with safety guardrails
- Display structured results with clinical recommendations
- Save the screening to the Supabase database

## Current Status

✅ Database schema created and configured
✅ Vision model edge function deployed
✅ Risk assessment edge function deployed (using GPT-4o)
✅ Frontend application built and ready
⚠️ **Requires: OpenAI API key configuration**

## Security Notes

- The application includes strict safety guardrails
- Never diagnoses or recommends treatment
- All outputs require clinician review
- Male patients are correctly excluded from postmenopausal risk factors
- Comprehensive audit trails are maintained
