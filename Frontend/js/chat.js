/**
 * chat.js — FINAL PRODUCTION VERSION (PharmaAI)
 * Stable • Safe • Hackathon Ready
 */

let conversationId = null;
let isTyping = false;
let isSending = false;
let transcriptBuffer = "";

/* ===============================
   SPEECH RECOGNITION
=============================== */

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
        transcriptBuffer += event.results[0][0].transcript + " ";
    };
}

document.addEventListener("DOMContentLoaded", async () => {

    const chatHistory = document.getElementById("chat-history");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const micBtn = document.getElementById("mic-btn");
    const historyBtn = document.getElementById("history-btn");

    /* ===============================
       SPEECH OUTPUT
    =============================== */

    function speakText(text) {
        if (!window.speechSynthesis) return;

        const clean = text.replace(/<[^>]*>/g, "");
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
    }

    /* ===============================
       MESSAGE RENDER
    =============================== */

    function addMsg(text, type = "bot") {

        const msg = document.createElement("div");
        msg.className = `msg ${type}`;

        const time = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

        msg.innerHTML = `
        <div class="msg-avatar">
            <i class="fa-solid ${type === "user" ? "fa-user" : "fa-user-nurse"}"></i>
        </div>
        <div>
            <div class="msg-bubble">${text}</div>
            <div class="msg-time">${time}</div>
        </div>
        `;

        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    /* ===============================
       TYPING INDICATOR
    =============================== */

    function showTyping() {
        if (isTyping) return;

        const el = document.createElement("div");
        el.className = "msg bot";
        el.id = "typing-indicator";

        el.innerHTML = `
        <div class="msg-avatar">
            <i class="fa-solid fa-user-nurse"></i>
        </div>
        <div class="msg-bubble">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
        `;

        chatHistory.appendChild(el);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        isTyping = true;
    }

    /* ===============================
       SEND MESSAGE
    =============================== */

    async function handleSend() {

        const val = userInput.value.trim();
        if (!val || isTyping || isSending) return;

        isSending = true;

        addMsg(val, "user");
        userInput.value = "";
        showTyping();

        try {
            const res = await fetch(
                `http://127.0.0.1:8000/agent?query=${encodeURIComponent(val)}&conversation_id=${conversationId}`
            );

            const data = await res.json();
            let reply = "";

            // 🔎 PRODUCT SEARCH
            if (data.search_results) {

                reply = "<strong>🔎 Products Found</strong><br><br>";

                data.search_results.forEach(p => {
                    if ((p.similarity_score || 0) < 0.65) return;

                    reply += `
                    💊 <b>${p.product_name}</b><br>
                    💰 Price: ${p.price || ""}<br>
                    📦 Size: ${p.package_size || ""}<br>
                    ⭐ Match: ${(p.similarity_score || 0).toFixed(2)}<br>
                    <hr>`;
                });

                if (reply === "<strong>🔎 Products Found</strong><br><br>")
                    reply = "No strong matches found.";
            }

            // 🛒 ORDER RESPONSE
            else if (data.order) {

                reply = `
                ✅ ${data.order.message || "Order placed successfully"}<br>
                📦 Product: ${data.order.product_name || data.order.product || "N/A"}<br>
                📦 Qty: ${data.order.quantity || 1}<br>
                💰 Total: $${data.order.total_price || 0}
                `;

                setTimeout(() => {
                    window.location.href = "orders.html";
                }, 1800);
            }

            // 🤖 AI RESPONSE
            else if (data.ai_response) reply = data.ai_response;
            else if (data.message) reply = data.message;
            else reply = "I'm here to help!";

            const typingEl = document.getElementById("typing-indicator");

            if (typingEl) {
                typingEl.querySelector(".msg-bubble").innerHTML = reply;
                typingEl.removeAttribute("id");
            } else {
                addMsg(reply, "bot");
            }

            speakText(reply);

        } catch (err) {
            console.error(err);
            addMsg("⚠ Server connection failed", "bot");
        }

        isTyping = false;
        isSending = false;
    }

    /* ===============================
       VOICE INPUT
    =============================== */

    let mediaStream = null;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let silenceStart = null;
    let isRecording = false;

    const SILENCE_THRESHOLD = 35;
    const SILENCE_DURATION = 1500;

    async function startListening() {

        if (isRecording) return;

        transcriptBuffer = "";
        silenceStart = null;

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            alert("Microphone permission denied");
            return;
        }

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        isRecording = true;
        micBtn.classList.add("recording");

        if (recognition) recognition.start();
        detectVoice();
    }

    function stopListening() {

        if (!isRecording) return;

        isRecording = false;

        if (recognition) recognition.stop();
        if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
        if (audioContext) audioContext.close();

        micBtn.classList.remove("recording");

        if (transcriptBuffer.trim()) {
            userInput.value = transcriptBuffer.trim();
            handleSend();
        }
    }

    function detectVoice() {

        if (!isRecording) return;

        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (volume > SILENCE_THRESHOLD) {
            silenceStart = null;
        } else {
            if (!silenceStart) silenceStart = Date.now();
            else if (Date.now() - silenceStart > SILENCE_DURATION) {
                stopListening();
                return;
            }
        }

        requestAnimationFrame(detectVoice);
    }

    if (SpeechRecognition && micBtn)
        micBtn.addEventListener("click", startListening);

    /* ===============================
       START CONVERSATION
    =============================== */

    async function startConversation() {
        const res = await fetch("http://127.0.0.1:8000/chat/start", { method: "POST" });
        const data = await res.json();
        conversationId = data.conversation_id;
    }

    await startConversation();

    /* ===============================
       HISTORY LOADER
    =============================== */

    async function loadConversationHistory() {

        try {
            const res = await fetch("http://127.0.0.1:8000/chat/conversations?user_id=1");
            const data = await res.json();

            const list = document.getElementById("conversation-list");

            if (!data.length) {
                list.innerHTML = "<p>No previous chats</p>";
                return;
            }

            list.innerHTML = data.map(c => `
                <div class="conversation-item"
                     onclick="loadConversationMessages(${c.id})">
                    💬 Conversation #${c.id}
                    <small>${new Date(c.created_at).toLocaleString()}</small>
                </div>
            `).join("");

        } catch (err) {
            console.error(err);
        }
    }

    /* ===============================
       EVENTS
    =============================== */

    sendBtn.addEventListener("click", handleSend);

    userInput.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSend();
        }
    });

    if (historyBtn) {
        historyBtn.addEventListener("click", () => {
            document.getElementById("history-modal").classList.remove("hidden");
            loadConversationHistory();
        });
    }

    addMsg("Hello 👋 I am your Digital Pharmacist Assistant.", "bot");
});

/* ===============================
   LOAD CONVERSATION MESSAGES
=============================== */

window.loadConversationMessages = async function (id) {

    try {
        conversationId = id;

        const res = await fetch(
            `http://127.0.0.1:8000/chat/messages?conversation_id=${id}`
        );

        const messages = await res.json();
        const chatHistory = document.getElementById("chat-history");
        chatHistory.innerHTML = "";

        messages.forEach(m => {
            const msg = document.createElement("div");
            msg.className = `msg ${m.role === "user" ? "user" : "bot"}`;
            msg.innerHTML = `
                <div class="msg-avatar">
                    <i class="fa-solid ${m.role === "user" ? "fa-user" : "fa-user-nurse"}"></i>
                </div>
                <div>
                    <div class="msg-bubble">${m.message}</div>
                </div>
            `;
            chatHistory.appendChild(msg);
        });

        document.getElementById("history-modal").classList.add("hidden");

    } catch (err) {
        console.error(err);
    }
};