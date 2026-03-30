const validator = require("validator");


const validate = (data) => {
  const {
    name,
    email,
    phone,
    password,
    provider,      // frontend can send provider, or leave it undefined
    providerId,
    dateOfBirth,
    role,
    collegeId,
  } = data;

  // =========================
  // PROVIDER HANDLING
  // =========================
  const authProvider = provider || "local"; // default to local if not sent

  if (!["local", "google", "facebook"].includes(authProvider)) {
    throw new Error("Invalid provider. Must be one of 'local', 'google', 'facebook'");
  }

  // =========================
  // REQUIRED FIELDS
  // =========================
  let mandatoryFields = ["name", "email", "dateOfBirth", "role", "collegeId"];

  if (authProvider === "local") {
    mandatoryFields.push("password");
  } else {
    mandatoryFields.push("providerId");
  }

  const missingFields = mandatoryFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ""
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing mandatory field(s): ${missingFields.join(", ")}`);
  }

  // =========================
  // NAME VALIDATION
  // =========================
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  // =========================
  // EMAIL VALIDATION
  // =========================
  if (!validator.isEmail(email)) {
    throw new Error("Invalid email format");
  }

  // =========================
  // PHONE VALIDATION (Optional, International)
  // =========================
  if (phone && !validator.isMobilePhone(phone, "any")) {
    throw new Error(
      "Invalid phone number. Use international format (e.g. +14155552671)"
    );
  }

  // =========================
  // DATE OF BIRTH VALIDATION
  // =========================
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) {
    throw new Error("Invalid dateOfBirth");
  }

  if (dob > new Date()) {
    throw new Error("dateOfBirth cannot be in the future");
  }

  // =========================
  // ROLE & COLLEGE ID VALIDATION
  // =========================
  if (!validator.isMongoId(String(role))) {
    throw new Error("Invalid role ID");
  }

  if (!validator.isMongoId(String(collegeId))) {
    throw new Error("Invalid college ID");
  }

  // =========================
  // PASSWORD VALIDATION (Local Only)
  // =========================
  if (authProvider === "local") {
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      throw new Error(
        "Password must be at least 8 characters long and include uppercase, lowercase, number and symbol"
      );
    }
  }

  // =========================
  // PROVIDER ID VALIDATION (Social Login)
  // =========================
  if (authProvider !== "local") {
    if (typeof providerId !== "string" || providerId.trim().length === 0) {
      throw new Error("providerId is required for social login");
    }
  }
};

module.exports = validate;
