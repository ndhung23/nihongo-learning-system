import assert from "node:assert/strict";
import test from "node:test";
import {
  getMessage,
  getTranslationDiagnostics,
  isSupportedLocale,
  messages,
  resolveLocale,
  translateUiText,
  uiTranslations,
} from "../app/flashcards/i18n/core.js";

test("Vietnamese and English message catalogs have identical keys", () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.vi).sort());
  assert.ok(Object.keys(messages.vi).length >= 50);
});

test("every message can be translated in both directions", () => {
  for (const key of Object.keys(messages.vi)) {
    assert.equal(getMessage("vi", key), messages.vi[key]);
    assert.equal(getMessage("en", key), messages.en[key]);
    assert.equal(translateUiText(messages.vi[key], "en"), messages.en[key], key);
    assert.equal(translateUiText(messages.en[key], "vi"), messages.vi[key], key);
  }
});

test("locale resolution prefers a valid saved setting and safely falls back", () => {
  assert.equal(resolveLocale("en", "vi-VN"), "en");
  assert.equal(resolveLocale("vi", "en-US"), "vi");
  assert.equal(resolveLocale(null, "en-GB"), "en");
  assert.equal(resolveLocale("ja", "ja-JP"), "vi");
  assert.equal(isSupportedLocale("en"), true);
  assert.equal(isSupportedLocale("ja"), false);
});

test("legacy UI translations are unique and reversible", () => {
  assert.deepEqual(getTranslationDiagnostics(), {
    duplicateVietnamese: [],
    duplicateEnglish: [],
  });

  for (const [viTemplate, enTemplate] of uiTranslations) {
    const sampleValue = (name) => ({
      count: "2",
      current: "1",
      target: "2",
      lesson: "18",
      level: "N5",
      range: "1-25",
    })[name] || "sample";
    const vi = viTemplate.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, name) => sampleValue(name));
    const en = enTemplate.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, name) => sampleValue(name));
    assert.equal(translateUiText(vi, "en"), en, viTemplate);
    assert.equal(translateUiText(en, "vi"), vi, enTemplate);
  }
});

test("dynamic values and surrounding whitespace are preserved", () => {
  assert.equal(translateUiText("  12 học viên\n", "en"), "  12 learners\n");
  assert.equal(translateUiText("1 học viên", "en"), "1 learner");
  assert.equal(translateUiText("Lesson 18", "vi"), "Bài 18");
  assert.equal(translateUiText("日本語", "en"), "日本語");
  assert.equal(translateUiText("user supplied content", "vi"), "user supplied content");
});
