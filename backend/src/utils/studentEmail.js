const normalizeEmail = (value = "") => value.trim().toLowerCase();

const normalizeDomain = (value = "") =>
  normalizeEmail(value).replace(/^@/, "").replace(/\.$/, "");

const normalizeCollegeCode = (value = "") =>
  normalizeEmail(value).replace(/[^a-z0-9]/g, "");

const getEmailParts = (email = "") => {
  const normalized = normalizeEmail(email);
  const [localPart = "", domain = ""] = normalized.split("@");

  return {
    localPart,
    domain,
  };
};

const isStudentEmailFormat = (email = "") => {
  const { localPart } = getEmailParts(email);
  return /(?:\.ug|\.pg)\d*/i.test(localPart);
};

const getCollegeEmailDomains = (college = {}) => {
  const domains = new Set();
  const code = normalizeCollegeCode(college.code);

  if (code) {
    domains.add(`${code}.ac.in`);
    domains.add(`${code}.edu.in`);
    domains.add(`${code}.edu`);
    domains.add(`${code}.in`);
  }

  if (Array.isArray(college.emailDomains)) {
    college.emailDomains.forEach((domain) => {
      const normalized = normalizeDomain(domain);
      if (normalized) {
        domains.add(normalized);
      }
    });
  }

  return [...domains];
};

const studentEmailMatchesCollege = (email, college) => {
  if (!email || !college) {
    return false;
  }

  const { localPart, domain } = getEmailParts(email);
  const normalizedCode = normalizeCollegeCode(college.code);
  const normalizedDomain = normalizeDomain(domain);

  if (!localPart || !normalizedCode || !normalizedDomain) {
    return false;
  }

  if (!isStudentEmailFormat(email)) {
    return false;
  }

  const allowedDomains = getCollegeEmailDomains(college);

  if (allowedDomains.includes(normalizedDomain)) {
    return true;
  }

  const firstLabel = normalizedDomain.split(".")[0];

  return (
    firstLabel === normalizedCode ||
    normalizedDomain === normalizedCode ||
    normalizedDomain.startsWith(`${normalizedCode}.`) ||
    normalizedDomain.includes(`.${normalizedCode}.`)
  );
};

module.exports = {
  normalizeEmail,
  normalizeDomain,
  normalizeCollegeCode,
  getEmailParts,
  isStudentEmailFormat,
  getCollegeEmailDomains,
  studentEmailMatchesCollege,
};
