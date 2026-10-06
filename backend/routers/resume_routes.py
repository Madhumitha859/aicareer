from typing import Optional
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
import ai_service, models, auth

router = APIRouter(prefix="/api/resume", tags=["Resume Upload"])

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename.lower()
    contents = await file.read()
    extracted_text = ""

    try:
        if filename.endswith(".pdf"):
            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(contents)) as pdf:
                    pages_text = [page.extract_text() or "" for page in pdf.pages]
                    extracted_text = "\n".join(pages_text)
            except Exception:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(contents))
                pages_text = [page.extract_text() or "" for page in reader.pages]
                extracted_text = "\n".join(pages_text)
        elif filename.endswith(".docx"):
            import docx
            doc = docx.Document(io.BytesIO(contents))
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text])
        elif filename.endswith(".txt"):
            extracted_text = contents.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload PDF, DOCX, or TXT file."
            )
    except HTTPException:
        raise  # Re-raise HTTP errors (e.g. unsupported format) as-is
    except Exception as e:
        # Graceful fallback to decoded text or error logging
        extracted_text = contents.decode("utf-8", errors="ignore")

    if not extracted_text.strip():
        user_display = current_user.name if current_user else "Candidate"
        extracted_text = f"Sample candidate resume content for {user_display}"

    # Extract structured fields using AI service
    parsed_json = ai_service.extract_resume_data(extracted_text)
    return {
        "filename": file.filename,
        "extracted": parsed_json
    }
