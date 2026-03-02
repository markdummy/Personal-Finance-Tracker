// AUTHENTICATION MODULE - USER DATABASE BACKED BY SERVER (SQLite via REST API)
// Falls back to localStorage when the backend is unavailable.

const Auth = {
  USERS_KEY: "financeTrackerUsers",
  SESSION_KEY: "financeTrackerSession",
  API_BASE: "/api/auth",

  // ── BACKEND API HELPERS ───────────────────────────────────────────────────

  async _apiPost(endpoint, body) {
    const res = await fetch(this.API_BASE + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  // ── LOCALSTORAGE FALLBACK (used when backend is unreachable) ──────────────

  // SIMPLE DETERMINISTIC HASH — fallback only.
  // ⚠️ NOT cryptographically secure. Use the backend for real auth.
  _hashPassword(password) {
    let h = 5381;
    for (let i = 0; i < password.length; i++) {
      h = (((h << 5) + h) ^ password.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  },

  // READ ALL USERS FROM LOCALSTORAGE (fallback)
  _getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch {
      return [];
    }
  },

  // WRITE ALL USERS TO LOCALSTORAGE (fallback)
  _saveLocalUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  // REGISTER via localStorage (fallback)
  _registerLocal(username, password) {
    const users = this._getLocalUsers();
    if (users.find((u) => u.username === username))
      return { success: false, message: "Username already taken." };

    const user = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      username,
      passwordHash: this._hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    this._saveLocalUsers(users);
    console.log("✅ USER REGISTERED (local fallback):", username);
    return { success: true, user };
  },

  // LOGIN via localStorage (fallback)
  _loginLocal(username, password, rememberMe) {
    const users = this._getLocalUsers();
    const user = users.find(
      (u) =>
        u.username === username &&
        u.passwordHash === this._hashPassword(password)
    );
    if (!user)
      return { success: false, message: "Invalid username or password." };
    this._saveSession(user, rememberMe);
    console.log("✅ USER LOGGED IN (local fallback):", username);
    return { success: true, user };
  },

  // ── SESSION HELPERS ───────────────────────────────────────────────────────

  _saveSession(user, rememberMe) {
    const session = {
      userId: user.id,
      username: user.username,
      loginTime: new Date().toISOString(),
      rememberMe: !!rememberMe,
    };
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  // REGISTER A NEW USER (calls backend, falls back to localStorage)
  async register(username, password) {
    username = (username || "").trim().toLowerCase();
    password = password || "";

    if (!username || !password)
      return { success: false, message: "Username and password are required." };
    if (username.length < 3)
      return {
        success: false,
        message: "Username must be at least 3 characters.",
      };
    if (password.length < 6)
      return {
        success: false,
        message: "Password must be at least 6 characters.",
      };

    try {
      const result = await this._apiPost("/register", { username, password });
      if (result.success) console.log("✅ USER REGISTERED:", username);
      return result;
    } catch (err) {
      console.warn("⚠️ Backend unavailable — using local fallback for register:", err.message);
      return this._registerLocal(username, password);
    }
  },

  // LOGIN AN EXISTING USER (calls backend, falls back to localStorage)
  // rememberMe=true stores the session in localStorage so it survives
  // browser restarts (important for mobile devices).
  async login(username, password, rememberMe) {
    username = (username || "").trim().toLowerCase();
    password = password || "";

    if (!username || !password)
      return { success: false, message: "Username and password are required." };

    try {
      const result = await this._apiPost("/login", { username, password });
      if (result.success) {
        this._saveSession(result.user, rememberMe);
        console.log("✅ USER LOGGED IN:", username, rememberMe ? "(remembered)" : "");
      }
      return result;
    } catch (err) {
      console.warn("⚠️ Backend unavailable — using local fallback for login:", err.message);
      return this._loginLocal(username, password, rememberMe);
    }
  },

  // LOGOUT CURRENT USER
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    console.log("👋 USER LOGGED OUT");
  },

  // GET CURRENT SESSION
  // Checks localStorage first (remembered sessions), then sessionStorage.
  getSession() {
    try {
      const localRaw = localStorage.getItem(this.SESSION_KEY);
      if (localRaw) {
        const localSession = JSON.parse(localRaw);
        if (localSession && localSession.rememberMe) return localSession;
        // Stored without rememberMe — treat as stale and remove it.
        localStorage.removeItem(this.SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(this.SESSION_KEY);
    }
    try {
      return JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  getCurrentUser() {
    return this.getSession();
  },

  // RETURN THE LOCALSTORAGE KEY FOR THE CURRENT USER'S FINANCE DATA
  getDataKey() {
    const session = this.getSession();
    return session
      ? `financeTrackerData_${session.userId}`
      : "financeTrackerData";
  },
};

window.Auth = Auth;
console.log("🔐 AUTH LOADED");
