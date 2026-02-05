const containerEl = document.querySelector(".container");
const btnEl = document.querySelector(".btn");
const popupContainerEl = document.querySelector(".popup-container");
const closeIconEl = document.querySelector(".close-icon");

/* ===== PASSWORD VISIBILITY TOGGLE (SAFE ADDITION) ===== */
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

if (passwordInput && togglePassword) {
  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.classList.toggle("fa-eye");
    togglePassword.classList.toggle("fa-eye-slash");
  });
}
/* ===== END PASSWORD TOGGLE ===== */

btnEl.addEventListener("click", () => {
  containerEl.classList.add("active");
  popupContainerEl.classList.remove("active");
});

closeIconEl.addEventListener("click", () => {
  containerEl.classList.remove("active");
  popupContainerEl.classList.add("active");
});

const loginBtn = document.querySelector(".popup-btn");

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault(); // ✅ critical

  const username = document.getElementById("username").value.trim();
  const userType = document.getElementById("userType").value;
  const password = document.getElementById("password").value.trim();

  if (!username || !userType || !password) {
    alert("All fields are required");
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, userType, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("fullName", data.fullName);

    if (data.role === "admin" || data.role === "staff") {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/student-dashboard";
    }

  } catch (error) {
    console.error("Server error:", error);
    alert("Server error");
  }
});
