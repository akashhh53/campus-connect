const normalizeEmail = (value = "") => value.trim().toLowerCase();

const normalizeDomain = (value = "") =>
  normalizeEmail(value).replace(/^@/, "").replace(/\.$/, "");

const normalizeCollegeCode = (value = "") =>
  normalizeEmail(value).replace(/[^a-z0-9]/g, "");

const getCollegeNameAcronym = (name = "") => {
  const ignoredWords = new Set(["and", "of", "the", "for", "in", "at", "&"]);
  const acronym = String(name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !ignoredWords.has(word))
    .map((word) => word[0])
    .join("");

  return normalizeCollegeCode(acronym);
};

const getCollegeAliases = (college = {}) => {
  const aliases = new Set();
  const code = normalizeCollegeCode(college.code);
  const compactName = normalizeCollegeCode(college.name);
  const acronym = getCollegeNameAcronym(college.name);

  [code, compactName, acronym].forEach((alias) => {
    if (alias) {
      aliases.add(alias);
    }
  });

  return [...aliases];
};

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

  getCollegeAliases(college).forEach((alias) => {
    domains.add(`${alias}.ac.in`);
    domains.add(`${alias}.edu.in`);
    domains.add(`${alias}.edu`);
    domains.add(`${alias}.in`);
  });

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
  const aliases = getCollegeAliases(college);
  const normalizedDomain = normalizeDomain(domain);

  if (!localPart || aliases.length === 0 || !normalizedDomain) {
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

  return aliases.some(
    (alias) =>
      firstLabel === alias ||
      normalizedDomain === alias ||
      normalizedDomain.startsWith(`${alias}.`) ||
      normalizedDomain.includes(`.${alias}.`),
  );
};

module.exports = {
  normalizeEmail,
  normalizeDomain,
  normalizeCollegeCode,
  getCollegeNameAcronym,
  getCollegeAliases,
  getEmailParts,
  isStudentEmailFormat,
  getCollegeEmailDomains,
  studentEmailMatchesCollege,
};
