import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
FROM_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

client = Client(ACCOUNT_SID, AUTH_TOKEN)


def send_whatsapp_message(to_number: str, message: str):
    try:
        if not to_number.startswith("+"):
            raise ValueError("Phone number must include country code")

        formatted_to = f"whatsapp:{to_number}"

        msg = client.messages.create(
            from_=FROM_NUMBER,
            body=message,
            to=formatted_to
        )

        print("✅ WhatsApp sent")
        return True

    except Exception as e:
        print("❌ WhatsApp Error:", e)
        return False