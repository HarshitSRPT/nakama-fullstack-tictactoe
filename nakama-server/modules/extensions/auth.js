// ──────────────────────────────────────────────────────────────
// Authentication RPCs
// Username/password registration and login using SHA-256
// hashing and Nakama custom auth for session tokens.
// ──────────────────────────────────────────────────────────────

function rpcRegisterUser(ctx, logger, nk, payload) {
  var input;
  try {
    input = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ success: false, error: "Invalid JSON payload" });
  }

  var username = (input.username || "").trim().toLowerCase();
  var password = input.password || "";

  if (!username || username.length < 3) {
    return JSON.stringify({ success: false, error: "Username must be at least 3 characters" });
  }
  if (!password || password.length < 4) {
    return JSON.stringify({ success: false, error: "Password must be at least 4 characters" });
  }

  // Check if username is already taken
  try {
    var existing = nk.storageRead([{
      collection: "auth",
      key: username,
      userId: "00000000-0000-0000-0000-000000000000"
    }]);
    if (existing && existing.length > 0) {
      return JSON.stringify({ success: false, error: "Username already exists" });
    }
  } catch (e) {
    // Key not found is expected for new registrations
  }

  var salt = nk.uuidv4();
  var passwordHash = nk.sha256Hash(salt + password);

  // Create a Nakama account via custom auth (create = true)
  var result;
  try {
    result = nk.authenticateCustom(username, username, true);
  } catch (e) {
    logger.error("authenticateCustom failed during registration: " + e.message);
    return JSON.stringify({ success: false, error: "Account creation failed" });
  }

  var userId = result.userId;

  // Generate a session token for the client.
  // authenticateTokenGenerate expects an absolute Unix timestamp for expiry.
  var tokenResult;
  try {
    var expiresAt = Math.floor(Date.now() / 1000) + 7200;
    tokenResult = nk.authenticateTokenGenerate(userId, username, expiresAt);
  } catch (e) {
    logger.error("Token generation failed during registration: " + e.message);
    return JSON.stringify({ success: false, error: "Session creation failed" });
  }

  // Store credentials in a system-owned storage object
  try {
    nk.storageWrite([{
      collection: "auth",
      key: username,
      userId: "00000000-0000-0000-0000-000000000000",
      value: {
        username: username,
        salt: salt,
        passwordHash: passwordHash,
        userId: userId
      },
      permissionRead: 0,
      permissionWrite: 0
    }]);
  } catch (e) {
    logger.error("Failed to store credentials: " + e.message);
    return JSON.stringify({ success: false, error: "Failed to save credentials" });
  }

  // Initialise empty player stats
  try {
    initPlayerStats(nk, logger, userId);
  } catch (e) {
    logger.warn("Could not initialise player stats: " + e.message);
  }

  logger.info("User registered: " + username + " (" + userId + ")");
  return JSON.stringify({
    success: true,
    userId: userId,
    username: username,
    token: tokenResult.token
  });
}

function rpcLoginUser(ctx, logger, nk, payload) {
  var input;
  try {
    input = JSON.parse(payload);
  } catch (e) {
    return JSON.stringify({ success: false, error: "Invalid JSON payload" });
  }

  var username = (input.username || "").trim().toLowerCase();
  var password = input.password || "";

  if (!username || !password) {
    return JSON.stringify({ success: false, error: "Username and password required" });
  }

  // Read stored credentials
  var records;
  try {
    records = nk.storageRead([{
      collection: "auth",
      key: username,
      userId: "00000000-0000-0000-0000-000000000000"
    }]);
  } catch (e) {
    return JSON.stringify({ success: false, error: "Invalid username or password" });
  }

  if (!records || records.length === 0) {
    return JSON.stringify({ success: false, error: "Invalid username or password" });
  }

  var stored = records[0].value;
  var passwordHash = nk.sha256Hash((stored.salt || "") + password);

  if (stored.passwordHash !== passwordHash) {
    return JSON.stringify({ success: false, error: "Invalid username or password" });
  }

  // Generate a session token for the client.
  var tokenResult;
  try {
    var expiresAt = Math.floor(Date.now() / 1000) + 7200;
    tokenResult = nk.authenticateTokenGenerate(stored.userId, username, expiresAt);
  } catch (e) {
    logger.error("Token generation failed during login: " + e.message);
    return JSON.stringify({ success: false, error: "Authentication failed" });
  }

  logger.info("User logged in: " + username + " (" + stored.userId + ")");
  return JSON.stringify({
    success: true,
    userId: stored.userId,
    username: username,
    token: tokenResult.token
  });
}
