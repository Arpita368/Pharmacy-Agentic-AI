from datetime import datetime

def send_whatsapp(phone: str, message: str):
    print("\n📲 WhatsApp Notification")
    print("To:", phone)
    print("Message:", message)
    print("Time:", datetime.now())


def send_email(email: str, subject: str, message: str):
    print("\n📧 Email Notification")
    print("To:", email)
    print("Subject:", subject)
    print("Message:", message)
    print("Time:", datetime.now())