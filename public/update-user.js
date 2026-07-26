const token = localStorage.getItem("token");

async function fetchUser() {
  const userId = document.getElementById("userId").value.trim();

  if (!userId) {
    alert("Enter User ID");
    return;
  }

  try {
    const res = await fetch(`/api/user/${userId}`, {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "An error occurred");
      return;
    }

    document.getElementById("fullName").value = data.fullName || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("department").value = data.department || "";
    document.getElementById("level").value = data.level || "";
    document.getElementById("updateForm").style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Failed to load user");
  }
}

// Handle update
document.getElementById("updateForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value.trim();
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const department = document.getElementById("department").value.trim();
  const level = document.getElementById("level").value.trim();

  if (!fullName || !email) {
    alert("Full name and email are required");
    return;
  }

  const payload = {
    fullName,
    email,
    department: department || null,
    level: level || null
  };

  try {
    const res = await fetch(`/api/user/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok) {
      alert("User updated successfully");
    } else {
      alert(result.message || "Update failed");
    }
  } catch (err) {
    console.error(err);
    alert("Network error — update failed");
  }
});