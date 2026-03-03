import ollama
from app.observability import tracer

# connect to local Ollama
client = ollama.Client(host="http://localhost:11434")


class PharmacyAI:

    def ask_llm(self, user_query: str):

        with tracer.start_as_current_span("PharmacyLLM"):

            try:
                if not user_query or not user_query.strip():
                    return "Please ask a pharmacy-related question."

                prompt = f"""
You are PharmaAI, an intelligent pharmacy assistant.

GOALS:
• Provide safe health guidance
• Suggest OTC medicines when appropriate
• Explain medicine uses & side effects
• Be friendly and conversational
• Keep answers SHORT (2–4 lines)

SAFETY RULES:
• NEVER prescribe prescription drugs
• NEVER diagnose diseases
• Always suggest doctor consultation if symptoms are severe
• Mention precautions when needed

YOU CAN HELP WITH:
✔ cold, cough, fever relief
✔ allergies & digestion issues
✔ vitamins & supplements
✔ pain relief guidance
✔ medicine usage & side effects

EMERGENCY SYMPTOMS:
If symptoms include chest pain, breathing difficulty, severe bleeding,
loss of consciousness, or stroke signs → advise immediate medical help.

TONE:
Friendly, simple, empathetic, human-like.

User:
{user_query}
"""

                response = client.chat(
                    model="phi3",   # fast & CPU friendly
                    messages=[{"role": "user", "content": prompt}],
                    options={
                        "temperature": 0.4,
                        "num_predict": 200
                    }
                )

                if response and "message" in response:
                    return response["message"]["content"].strip()

                return "I'm here to help with pharmacy and health questions."

            except Exception as e:
                print("LLM ERROR:", e)
                return "AI service temporarily unavailable."


assistant = PharmacyAI()


def ask_llm(user_query: str):
    return assistant.ask_llm(user_query)