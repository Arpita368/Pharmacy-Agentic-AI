from app.agents.intent_agent import extract_intent
from app.agents.semantic_search import semantic_search
from app.agents.safety_agent import validate_order
from app.agents.order_agent import create_order
from app.agents.logger import log_event
from app.agents.llm_agent import ask_llm
from app.agents.alert_agent import check_low_stock   # ✅ FIXED
from app.observability import tracer
from app.agents.safety_agent import check_emergency

# 🧠 simple conversation memory (demo)
conversation_state = {}


def handle_query(user_input: str, conversation_id: int = 1):
    """
    🧠 Main brain of the Agentic AI Pharmacy System
    Controls decision flow & conversation memory.
    """

    # 🚨 EMERGENCY SAFETY CHECK
    emergency_check = check_emergency(user_input)
    if not emergency_check.get("approved"):
        return {"message": emergency_check.get("message")}

    with tracer.start_as_current_span("User Request"):

        if not user_input or not user_input.strip():
            return {"message": "Please enter your query."}

        log_event("USER_QUERY", user_input)

        # =========================
        # LOAD CONVERSATION STATE
        # =========================
        state = conversation_state.get(conversation_id, {})

        # ==================================================
        # 📍 WAITING FOR ADDRESS
        # ==================================================
        if state.get("awaiting_address"):

            address = user_input.strip()
            order_data = state.get("pending_order")

            if not order_data:
                conversation_state.pop(conversation_id, None)
                return {"message": "Order session expired. Please order again."}
            
            print("DEBUG → order_data:", order_data)

            order = create_order(
                product_id=order_data["product_id"],
                product_name=order_data["product_name"],
                quantity=order_data["quantity"],
                price=order_data["price"],
                address=address
            )

            # clear session
            conversation_state.pop(conversation_id, None)

            alerts = check_low_stock()

            return {
                "message": (
                    "✅ Order placed successfully!\n"
                    f"📦 Delivery Address: {address}\n"
                    f"🧾 Order ID: {order.get('order_id')}"
                ),
                "order": order,
                "stock_alerts": alerts
            }

        # =========================
        # INTENT DETECTION
        # =========================
        intent_data = extract_intent(user_input)
        intent = intent_data.get("intent")
        keyword = intent_data.get("keyword")
        quantity = intent_data.get("quantity", 1)

        log_event("INTENT_DETECTED", f"{intent} | keyword={keyword}")

        # ==================================================
        # ❌ USER DECLINED
        # ==================================================
        if intent == "decline":
            return {
                "message": "👍 Okay! Let me know if you need anything."
            }

        # ==================================================
        # 🔍 SEARCH PRODUCT
        # ==================================================
        if intent == "search_product":

            log_event("SEARCH", keyword)
            results = semantic_search(keyword)

            if not results:
                return {
                    "message": "No matching medicines found. Please check the name."
                }

            return {"search_results": results}

        # ==================================================
        # 🛒 ORDER PRODUCT
        # ==================================================
        if intent == "order_product":

            log_event("ORDER_ATTEMPT", keyword)

            validation = validate_order(keyword, quantity=quantity)

            if not validation.get("approved"):
                return {"message": validation.get("message")}

            if not validation.get("product_id"):
                return {"message": "Product not found or unavailable."}

            # save state → ask address
            conversation_state[conversation_id] = {
                "awaiting_address": True,
                "pending_order": {
                    "product_id": validation["product_id"],
                    "product_name": validation["product_name"],
                    "quantity": quantity,
                    "price": validation.get("price", 0)
                }
            }

            return {
                "message": (
                    f"🛒 You are ordering:\n"
                    f"• {validation['product_name']}\n"
                    f"• Quantity: {quantity}\n\n"
                    "📦 Please provide delivery address."
                )
            }

        # ==================================================
        # 💊 MEDICINE INFO
        # ==================================================
        if intent == "medicine_info":
            log_event("MEDICINE_INFO_QUERY", keyword)
            ai_reply = ask_llm(user_input)

            return {
                "ai_response": ai_reply or "I'm here to help with medicine information."
            }

        # ==================================================
        # 🤒 SYMPTOM QUERY
        # ==================================================
        if intent == "symptom_query":
            log_event("SYMPTOM_QUERY", user_input)
            ai_reply = ask_llm(user_input)
            return {"ai_response": ai_reply}

        # ==================================================
        # 👋 GREETING
        # ==================================================
        if intent == "greeting":
            return {
                "ai_response": "Hello 👋 I’m your pharmacy assistant. How can I help you today?"
            }

        # ==================================================
        # 🤖 FALLBACK → AI
        # ==================================================
        log_event("UNKNOWN_INTENT", user_input)
        ai_reply = ask_llm(user_input)

        return {
            "ai_response": ai_reply or "I'm here to help with medicines and orders."
        }