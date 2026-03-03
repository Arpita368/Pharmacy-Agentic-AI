import re
from app.observability import tracer


def extract_intent(user_input: str):

    with tracer.start_as_current_span("Intent Analysis"):

        if not user_input:
            return {"intent": "unknown", "keyword": "", "quantity": 1}

        text = user_input.lower().strip()
        text = re.sub(r"[^\w\s]", "", text)

        words = text.split()

        # =========================
        # ❌ DECLINE / STOP
        # =========================
        decline_words = {
            "nothing", "no", "nope", "cancel", "stop",
            "dont want", "do not want", "not needed",
            "leave", "exit", "no thanks"
        }

        if any(phrase in text for phrase in decline_words):
            return {"intent": "decline", "keyword": "", "quantity": 1}

        # =========================
        # 🙏 THANKS
        # =========================
        if text in {"thanks", "thank you", "thx"}:
            return {"intent": "thanks", "keyword": "", "quantity": 1}

        # =========================
        # 👋 GREETING
        # =========================
        if text in {"hi", "hello", "hey"}:
            return {"intent": "greeting", "keyword": "", "quantity": 1}

        # =========================
        # 👍 CASUAL ACK
        # =========================
        if text in {"ok", "okay", "fine", "cool", "good"}:
            return {"intent": "casual", "keyword": "", "quantity": 1}

        # =========================
        # 🧮 EXTRACT QUANTITY
        # =========================
        quantity = 1
        for w in words:
            if w.isdigit():
                quantity = int(w)

        # =========================
        # 🤒 SYMPTOMS
        # =========================
        symptom_words = {
            "fever","cold","cough","headache","pain","vomiting",
            "nausea","diarrhea","flu","sore","throat","infection",
            "allergy","rash","itching","migraine","insomnia"
        }

        if any(word in symptom_words for word in words):
            return {"intent": "symptom_query", "keyword": text, "quantity": quantity}

        # =========================
        # 💊 MEDICINE INFO
        # =========================
        info_patterns = [
            "what is","used for","side effect","dosage",
            "how to take","safe","interaction","benefits"
        ]

        if any(pattern in text for pattern in info_patterns):
            return {"intent": "medicine_info", "keyword": text, "quantity": quantity}

        # =========================
        # 🛒 ORDER DETECTION
        # =========================
        order_words = {"buy", "order", "purchase", "get", "need"}

        if any(word in order_words for word in words):
            cleaned = " ".join(
                [w for w in words if w not in order_words and not w.isdigit()]
            )
            return {
                "intent": "order_product",
                "keyword": cleaned.strip(),
                "quantity": quantity
            }

        # =========================
        # 🔍 SEARCH (short queries)
        # =========================
        if len(words) <= 2:
            return {"intent": "search_product", "keyword": text, "quantity": quantity}

        # =========================
        # 🤖 FALLBACK → LLM
        # =========================
        return {"intent": "llm_fallback", "keyword": user_input, "quantity": quantity}