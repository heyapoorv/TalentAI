import pdfplumber
import docx
import io
import json
import google.generativeai as genai


def parse_resume(file_bytes: bytes, filename: str) -> str:
    """
    Parse text from PDF or DOCX file.
    Returns plain text.
    """
    text = ""
    try:
        if filename.lower().endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
        elif filename.lower().endswith(".docx"):
            doc = docx.Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            text = file_bytes.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error parsing resume {filename}: {e}")
        text = ""
        
    return text.strip()

async def extract_structured_data(text: str) -> str:
    """
    Extract structured data from resume text using Gemini if available.
    """
    from services.matcher import llm_model
    import json
    
    if llm_model:
        prompt = f"""
        Extract the following information from the resume text:
        1. Full Name
        2. Contact Info
        3. Top 5 Skills
        4. Experience Summary
        
        Resume text:
        {text[:4000]}
        
        Return strictly as JSON with keys: "name", "contact", "skills", "experience", "raw_text_preview".
        "raw_text_preview" should be a significant excerpt of the original text (up to 10000 chars).
        Do not use markdown.
        """
        try:
            try:
                response = await llm_model.generate_content_async(prompt)
            except Exception as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    fallback_model = genai.GenerativeModel("gemini-pro")
                    response = await fallback_model.generate_content_async(prompt)
                else:
                    raise e

            res_text = response.text.strip()
            # Basic cleaning
            if res_text.startswith("```json"): res_text = res_text[7:]
            if res_text.startswith("```"): res_text = res_text[3:]
            if res_text.endswith("```"): res_text = res_text[:-3]
            
            data = json.loads(res_text.strip())
            data["raw_text_preview"] = text[:10000]
            return json.dumps(data)

        except Exception as e:
            print(f"Gemini Extraction Error: {e}")
            
    # Fallback to simple placeholder
    data = {
        "name": "Unknown",
        "skills": ["Python", "General"],
        "experience": "Not extracted",
        "raw_text_preview": text[:10000]
    }
    return json.dumps(data)
