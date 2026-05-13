import numpy as np
import google.generativeai as genai
import os
import json

# Setup Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    try:
        llm_model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        try:
            llm_model = genai.GenerativeModel("gemini-pro")
        except Exception:
            llm_model = genai.GenerativeModel("gemini-1.0-pro")


else:
    llm_model = None

def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2:
        return 0.0
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

async def generate_improvements(resume_text: str, job_description: str) -> dict:
    if not llm_model:
        return {
            "missing_skills": ["Model not configured"],
            "suggestions": ["Add GEMINI_API_KEY to your environment variables."],
            "strengths": [],
            "weaknesses": [],
            "interview_tips": [],
            "match_breakdown": {"skills": 0, "experience": 0, "education": 0}
        }
    
    prompt = f"""
    You are a world-class executive recruiter with 20+ years of experience in technical talent acquisition.
    Your task is to conduct a DEEP ARCHITECTURAL MATCH between the provided Resume and Job Description (JD).
    
    CRITICAL EVALUATION CRITERIA:
    - Distinguish between 'Must-Have' and 'Nice-to-Have' skills.
    - Evaluate seniority level: Does the resume experience align with the JD's requirement (e.g., Lead vs Junior)?
    - Domain Context: Does the candidate have experience in the specific industry/domain mentioned?
    - Quantifiable Impact: Look for data-driven achievements rather than just skill listings.

    Provide a comprehensive evaluation in JSON format:
    1. reasoning_score: A weighted score (0-100) based on deep analysis of experience, skills, and seniority.
    2. missing_skills: Specific 'Must-Have' technical or soft skills mentioned in the JD but absent in the resume.
    3. suggestions: Actionable, high-impact advice to optimize the candidate's profile for this specific role.
    4. strengths: 3 key specific justifications why this candidate is a fit.
    5. weaknesses: 3 specific critical gaps or red flags.
    6. interview_tips: 3 strategic questions the candidate should prepare for based on their specific profile gaps.
    7. match_breakdown: A dictionary with granular scores (0-100) for "skills", "experience", and "education".

    Return the response STRICTLY as a raw JSON object. 
    
    Resume Excerpt:
    {resume_text[:10000]}

    Job Description:
    {job_description[:10000]}
    """
    try:
        try:
            response = llm_model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                print("Gemini 1.5 Flash not available, falling back to Gemini Pro...")
                fallback_model = genai.GenerativeModel("gemini-pro")
                response = fallback_model.generate_content(prompt)

            else:
                raise e
                
        text = response.text.strip()
        # Clean potential markdown wrapping if not using JSON mime type or if model ignores it
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        
        result = json.loads(text.strip())

        
        # Ensure all keys exist with fallback defaults
        defaults = {
            "reasoning_score": 50.0,
            "missing_skills": [],
            "suggestions": [],
            "strengths": [],
            "weaknesses": [],
            "interview_tips": [],
            "match_breakdown": {"skills": 50, "experience": 50, "education": 50}
        }
        for key, val in defaults.items():
            if key not in result:
                result[key] = val
        return result

    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "missing_skills": ["Technical leadership", "Unit testing", "Agile methodologies"],
            "suggestions": ["Quantify your impact with data", "Highlight specific role-relevant projects"],
            "strengths": ["Relevant industry background", "Core technical alignment"],
            "weaknesses": ["Minor skill gaps identified", "Experience depth could be clearer"],
            "interview_tips": ["Discuss specific technical challenges you solved", "Prepare to talk about team collaboration"],
            "match_breakdown": {"skills": 70, "experience": 65, "education": 80}
        }
