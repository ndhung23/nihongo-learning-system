import { execFileSync } from "node:child_process";

const forbiddenPaths = [
  /^scripts\/dethi\//,
  /^scripts\/build-n1-n2-master-data\.mjs$/,
  /^scripts\/build-n3-n4-master-data\.mjs$/,
  /^scripts\/build-n5-master-data\.mjs$/,
  /^scripts\/build-n5-illustrative-test\.mjs$/,
  /^scripts\/fill-jlpt-correct-indexes\.mjs$/,
];

const trackedFiles = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
  windowsHide: true,
})
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replaceAll("\\", "/"));

const leakedFiles = trackedFiles.filter((file) =>
  forbiddenPaths.some((pattern) => pattern.test(file)),
);

if (leakedFiles.length > 0) {
  console.error("Private JLPT data is tracked by Git:");
  for (const file of leakedFiles) {
    console.error(`- ${file}`);
  }
  console.error(
    "Remove these files from the Git index before pushing. Do not delete the local source data.",
  );
  process.exit(1);
}

console.log("OK: no private JLPT source or answer-key file is tracked by Git.");
