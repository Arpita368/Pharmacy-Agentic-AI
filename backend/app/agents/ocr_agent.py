import easyocr
import re

# Initialize reader only once (important)
reader = easyocr.Reader(['en'], gpu=False)

def clean_text(text: str) -> str:
    """
    Remove dosage numbers like 500mg, 10ml etc.
    Improves semantic search accuracy.
    """
    text = text.lower()
    text = re.sub(r'\b\d+\s?(mg|ml|g|mcg|capsules?|tablets?)\b', '', text)
    return text.strip()


def extract_medicine_lines(image_path: str):
    """
    Extract line-by-line medicine names from image
    """
    results = reader.readtext(image_path, detail=0)

    cleaned_lines = [
        clean_text(line)
        for line in results
        if line.strip()
    ]

    return cleaned_lines