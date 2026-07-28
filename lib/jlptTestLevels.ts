export const TEST_LEVELS = [
  "N5",
  "N4",
  "N3",
  "N2",
  "N1",
  "UNIVERSITY",
  "HIGH_SCHOOL",
  "OTHER",
] as const;

export type TestLevel = (typeof TEST_LEVELS)[number];

export const TEST_LEVEL_LABELS: Record<TestLevel, string> = {
  N5: "N5",
  N4: "N4",
  N3: "N3",
  N2: "N2",
  N1: "N1",
  UNIVERSITY: "Trường đại học",
  HIGH_SCHOOL: "THPT",
  OTHER: "Khác",
};

export function isTestLevel(value: string): value is TestLevel {
  return TEST_LEVELS.includes(value as TestLevel);
}

export function testLevelLabel(level: string) {
  return isTestLevel(level) ? TEST_LEVEL_LABELS[level] : level;
}

export function parseTestLevel(value: string) {
  const normalized = value.trim().toLocaleLowerCase("vi");
  return TEST_LEVELS.find((level) =>
    level.toLocaleLowerCase("vi") === normalized ||
    TEST_LEVEL_LABELS[level].toLocaleLowerCase("vi") === normalized
  );
}

export function testLevelToCourseLevel(level: TestLevel) {
  const courseLevels: Record<TestLevel, string> = {
    N5: "n5",
    N4: "n4",
    N3: "n3",
    N2: "n2",
    N1: "n1",
    UNIVERSITY: "university",
    HIGH_SCHOOL: "high_school",
    OTHER: "other",
  };

  return courseLevels[level];
}
