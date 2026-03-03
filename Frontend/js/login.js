// login.js

async function loginUser(event) {
    event.preventDefault(); // stop page reload

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("error-msg");

    errorBox.innerText = "";

    try {
        const formData = new URLSearchParams();
        formData.append("username", email);   // OAuth expects username
        formData.append("password", password);

        const response = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            errorBox.innerText = data.detail;
            return;
        }

        // ✅ Save token
        localStorage.setItem("token", data.access_token);

        // ✅ Redirect after login
        window.location.href = "dashboard.html";

    } catch (error) {
        errorBox.innerText = "Server not reachable";
    }
}