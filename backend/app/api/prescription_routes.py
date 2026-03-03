from fastapi import APIRouter, UploadFile, File
import numpy as np
import cv2

from app.agents.prescription_scanner import extract_text
from app.agents.medicine_parser import detect_medicines

router = APIRouter(tags=["Prescription Scanner"])


@router.post("/scan-prescription")
async def scan_prescription(file: UploadFile = File(...)):
    """
    Upload prescription image → extract text → detect medicines
    """

    try:
        # read uploaded file
        contents = await file.read()

        # convert bytes → numpy array
        nparr = np.frombuffer(contents, np.uint8)

        # decode image
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {"error": "Image could not be read"}

        # OCR text extraction
        text = extract_text(image)

        # detect medicines from text
        medicines = detect_medicines(text)

        return {
            "filename": file.filename,
            "extracted_text": text,
            "medicines_detected": medicines,
            "total_medicines_found": len(medicines)
        }

    except Exception as e:
        return {
            "error": str(e)
        }