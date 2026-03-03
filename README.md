# 💊 Pharmacy Agentic AI

An intelligent end-to-end **AI-powered Digital Pharmacist Assistant** built using FastAPI, FAISS, LLMs, and a multi-agent architecture.

Pharmacy Agentic AI combines semantic search, prescription OCR, LLM reasoning, and order management into one seamless healthcare workflow.

---

## 🚀 Vision

To build a context-aware AI pharmacy system that can:

- Understand natural language medicine queries
- Extract medicines from prescriptions
- Perform intelligent semantic product search
- Provide AI-based health assistance
- Manage cart and order workflows

---

## 🧠 Architecture Overview

The system follows an **Agentic AI architecture** with an orchestrator controlling multiple specialized agents.

### 🔹 Orchestrator
- Detects user intent
- Routes queries to appropriate agents

### 🔹 Semantic Search Agent
- FAISS for vector similarity search
- Sentence Transformers for embeddings
- RapidFuzz for fuzzy matching
- Returns ranked medicine results

### 🔹 LLM Assistant Agent
- Powered by Ollama (local LLM)
- Handles health-related and general queries
- Observability enabled using Langfuse

### 🔹 Prescription Scanner Agent
- EasyOCR for extracting text from prescriptions
- Extracted medicines passed to semantic search

---

## 🛠️ Tech Stack

### Backend
- FastAPI
- SQLAlchemy
- FAISS (CPU)
- Sentence Transformers
- Ollama
- Langfuse
- Whisper (voice transcription)

### Frontend
- HTML
- CSS
- JavaScript
- Chat interface
- Order history page
- Cart management

---

## ✨ Features

- 🔎 Intelligent semantic medicine search
- 💬 Conversational AI pharmacist
- 📷 Prescription image upload & extraction
- 🛒 Add to cart & order placement
- 📦 Order status tracking ("In Process")
- 🎤 Voice input support
- 📜 Export conversation history
- 🧠 Multi-agent routing logic

---

## ⚙️ How It Works

1. User sends a message or uploads prescription
2. Orchestrator detects intent
3. Request routed to:
   - Semantic Search Agent
   - LLM Assistant Agent
   - Prescription Scanner Agent
4. Response formatted and returned to UI
5. Orders stored in database with status tracking

---

## 🌍 Impact

Pharmacy Agentic AI demonstrates:

- Real-world multi-agent AI architecture
- AI-powered healthcare assistance
- Scalable pharmacy automation
- Practical integration of LLM + Vector Search

---

## 🔐 Future Improvements

- Role-based authentication
- Payment gateway integration
- Real-time inventory updates
- Multi-language support
- Cloud deployment

---

## 📜 License
MIT License
This project is open-source and free to use, modify, and distribute with attribution.

---

## 👩‍💻 Author
Built with ❤️ for healthcare innovation.
If you found this project useful, consider giving it a ⭐ on GitHub!
