// AUTHENTICATION MODULE - USER DATABASE BACKED BY LOCALSTORAGE

const Auth = {
  USERS_KEY: "financeTrackerUsers",
  SESSION_KEY: "financeTrackerSession",

  // SIMPLE DETERMINISTIC HASH — for client-side demo only.
  // ⚠️ NOT cryptographically secure. Do NOT use real passwords.
  // For production, use a server-side solution with bcrypt or Argon2.
  hashPassword(password) {
    let h = 5381;
    for (let i = 0; i < password.length; i++) {
      h = (((h << 5) + h) ^ password.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  },

  // READ ALL USERS FROM DATABASE (LOCALSTORAGE)
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.USERS_KEY)) || [];
    } catch {
      return [];
    }
  },

  // WRITE ALL USERS TO DATABASE (LOCALSTORAGE)
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  // REGISTER A NEW USER
  register(username, password) {
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

    const users = this.getUsers();
    if (users.find((u) => u.username === username))
      return { success: false, message: "Username already taken." };

    const user = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      username,
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this.saveUsers(users);
    console.log("✅ USER REGISTERED:", username);
    return { success: true, user };
  },

  // LOGIN AN EXISTING USER
  // rememberMe=true stores the session in localStorage so it survives
  // browser restarts (important for mobile devices).
  login(username, password, rememberMe) {
    username = (username || "").trim().toLowerCase();
    password = password || "";

    if (!username || !password)
      return { success: false, message: "Username and password are required." };

    const users = this.getUsers();
    const user = users.find(
      (u) =>
        u.username === username &&
        u.passwordHash === this.hashPassword(password)
    );

    if (!user)
      return { success: false, message: "Invalid username or password." };

    const session = {
      userId: user.id,
      username: user.username,
      loginTime: new Date().toISOString(),
      rememberMe: !!rememberMe,
    };
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.SESSION_KEY, JSON.stringify(session));
    console.log("✅ USER LOGGED IN:", username, rememberMe ? "(remembered)" : "");
    return { success: true, user };
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
