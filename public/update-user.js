const token = localStorage.getItem("token");

async function fetchUser() {
  const userId = document.getElementById("userId").value;

  if (!userId) {
    alert("Enter User ID");
    return;
  }

  const res = await fetch(`/api/user/${userId}`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!res.ok) {
    alert("User not found");
    return;
  }

  const user = await res.json();

  document.getElementById("fullName").value = user.fullName;
  document.getElementById("email").value = user.email;
  document.getElementById("department").value = user.department || "";
  document.getElementById("level").value = user.level || "";

  document.getElementById("updateForm").style.display = "block";
}

// Handle update
document.getElementById("updateForm").addEventListener("submit", async e => {
  e.preventDefault();

  const userId = document.getElementById("userId").value;

  const data = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    department: document.getElementById("department").value,
    level: document.getElementById("level").value
  };

  const res = await fetch(`/api/user/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (res.ok) {
    alert("User updated successfully");
  } else {
    alert(result.message);
  }
});
