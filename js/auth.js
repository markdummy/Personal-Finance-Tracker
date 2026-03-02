const Auth = {
  SESSION_KEY: "financeTrackerSession",

  // Determine the API base URL (same origin when served by the Node server)
  _apiBase() {
    return window.location.origin;
  },

  _getToken() {
    try {
      const session = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      return session ? session.token : null;
    } catch {
      return null;
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
    return this._getToken() !== null;
  },

  async register(username, password) {
    const trimmed = (username || "").trim().toLowerCase();
    if (!trimmed || !password)
      return { success: false, message: "Username and password are required." };
    if (trimmed.length < 3)
      return { success: false, message: "Username must be at least 3 characters." };
    if (password.length < 6)
      return { success: false, message: "Password must be at least 6 characters." };

    try {
      const res = await fetch(this._apiBase() + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(
          this.SESSION_KEY,
          JSON.stringify({ token: data.token, username: data.username })
        );
      }
      return data;
    } catch (err) {
      return { success: false, message: "Network error. Is the server running?" };
    }
  },

  async login(username, password) {
    const trimmed = (username || "").trim().toLowerCase();
    try {
      const res = await fetch(this._apiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(
          this.SESSION_KEY,
          JSON.stringify({ token: data.token, username: data.username })
        );
      }
      return data;
    } catch (err) {
      return { success: false, message: "Network error. Is the server running?" };
    }
  },

  // Verify the stored token with the server; logs out if invalid.
  async verifySession() {
    const token = this._getToken();
    if (!token) return false;
    try {
      const res = await fetch(this._apiBase() + "/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        this._clearSession();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  _clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  logout() {
    this._clearSession();
    const pathPrefix = document.body.dataset.pathPrefix || "";
    window.location.replace(pathPrefix + "pages/login.html");
  },
};

window.Auth = Auth;

// AUTH GUARD: redirect to login if not authenticated (synchronous fast-path
// using the locally-stored token; background server verification follows).
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
  // Protected page – redirect to login if no local session token
  if (!Auth.isLoggedIn()) {
    const pathPrefix = document.body.dataset.pathPrefix || "";
    window.location.replace(pathPrefix + "pages/login.html");
    return;
  }
  // Background: verify token is still valid on the server
  Auth.verifySession().then((valid) => {
    if (!valid) {
      const pathPrefix = document.body.dataset.pathPrefix || "";
      window.location.replace(pathPrefix + "pages/login.html");
    }
  });
})();
