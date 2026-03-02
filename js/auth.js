const Auth = {
  USERS_KEY: "financeTrackerUsers",
  SESSION_KEY: "financeTrackerSession",

  // Simple non-cryptographic hash (client-side demo only)
  hashPassword(password) {
    let hash = 5381;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) + hash) ^ password.charCodeAt(i);
      hash = hash >>> 0;
    }
    return hash.toString(16);
  },

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY) || "[]");
    } catch {
      return [];
    }
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  register(username, password) {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password)
      return { success: false, message: "Username and password are required." };
    if (trimmed.length < 3)
      return {
        success: false,
        message: "Username must be at least 3 characters.",
      };
    if (password.length < 6)
      return {
        success: false,
        message: "Password must be at least 6 characters.",
      };

    const users = this.getUsers();
    if (users.find((u) => u.username === trimmed))
      return { success: false, message: "Username already taken." };

    users.push({ username: trimmed, passwordHash: this.hashPassword(password) });
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return { success: true };
  },

  login(username, password) {
    const trimmed = username.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find(
      (u) =>
        u.username === trimmed &&
        u.passwordHash === this.hashPassword(password)
    );
    if (!user)
      return { success: false, message: "Invalid username or password." };

    localStorage.setItem(
      this.SESSION_KEY,
      JSON.stringify({ username: user.username })
    );
    return { success: true };
  },

  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    const pathPrefix = document.body.dataset.pathPrefix || "";
    window.location.replace(pathPrefix + "pages/login.html");
  },
};

window.Auth = Auth;

// AUTH GUARD: redirect to login if not authenticated (runs synchronously)
(function () {
  const page = document.body.dataset.page;
  if (page === "login") {
    // Already on login page – redirect to dashboard if already logged in
    if (Auth.isLoggedIn()) {
      const pathPrefix = document.body.dataset.pathPrefix || "../";
      window.location.replace(pathPrefix + "index.html");
    }
    return;
  }
  // Protected page – redirect to login if not logged in
  if (!Auth.isLoggedIn()) {
    const pathPrefix = document.body.dataset.pathPrefix || "";
    window.location.replace(pathPrefix + "pages/login.html");
  }
})();
