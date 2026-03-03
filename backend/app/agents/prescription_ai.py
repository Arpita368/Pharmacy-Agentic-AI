from google import genai
import PIL.Image
import json
import re

client = genai.Client()
MODEL_ID = "gemini-3-flash-preview"


def extract_medicines_from_image(image_path: str):
    """
    Uses Gemini Vision to extract medicine names and dosages
    Returns clean structured list
    """

    image = PIL.Image.open(image_path)

    prompt = """
    Act as a licensed pharmacist.
    Extract ONLY the medicine names and dosages from this handwritten prescription.

    Return the output strictly as JSON list format like:
    [
      {"name": "Paracetamol", "dosage": "500mg"},
      {"name": "Amoxicillin", "dosage": "250mg"}
    ]
    """

    response = client.models.generate_content(
        model=MODEL_ID,
        contents=[prompt, image]
    )

    text_output = response.text.strip()

    # Remove markdown if model wraps in ```json
    text_output = re.sub(r"```json|```", "", text_output).strip()

    try:
        medicines = json.loads(text_output)
        return medicines
    except:
        return []