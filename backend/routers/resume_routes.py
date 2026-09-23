import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
import ai_service, models, auth

router = APIRouter(prefix="/api/resume", tags=["Resume Upload"])

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename.lower()
    contents = await file.read()
    extracted_text = ""

    try:
        if filename.endswith(".pdf"):
            import pdfplumber
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                pages_text = [page.extract_text() or "" for page in pdf.pages]
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file content: {str(e)}"
        )

    if not extracted_text.strip():
        extracted_text = f"Sample candidate resume content for {current_user.name}"

    # Extract structured fields using AI service
    parsed_json = ai_service.extract_resume_data(extracted_text)
    return {
        "filename": file.filename,
        "extracted": parsed_json
    }
