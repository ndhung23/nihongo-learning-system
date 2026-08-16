"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getMessage,
  isSupportedLocale,
  messages,
  resolveLocale,
  STORAGE_KEY,
  translateUiText,
} from "./core";

export type AppLocale = "vi" | "en";

export type MessageKey = keyof typeof messages.vi;

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  translate: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const localizedAttributes = ["aria-label", "alt", "placeholder", "title"] as const;

type LocalizedValue = { source: string; rendered: string; translatable: boolean };

function canTranslateTextNode(node: Text) {
  const parent = node.parentElement;
  return Boolean(parent && !parent.closest("script, style, noscript, [data-i18n-ignore], [contenteditable='true']"));
}

function LegacyUiTranslator({ locale }: Readonly<{ locale: AppLocale }>) {
  const textValues = useRef(new WeakMap<Text, LocalizedValue>());
  const attributeValues = useRef(new WeakMap<Element, Map<string, LocalizedValue>>());

  useEffect(() => {
    const root = document.querySelector("[data-i18n-root]");
    if (!root) return;

    function translateTextNode(node: Text) {
      if (!canTranslateTextNode(node)) return;
      const current = node.data;
      const previous = textValues.current.get(node);
      const source = previous && current === previous.rendered ? previous.source : current;
      const translatable = previous && current === previous.rendered
        ? previous.translatable
        : translateUiText(source, "en") !== source;
      const rendered = translatable ? translateUiText(source, locale) : source;

      textValues.current.set(node, { source, rendered, translatable });
      if (current !== rendered) node.data = rendered;
    }

    function translateAttribute(element: Element, attribute: string) {
      if (!attribute || element.closest("[data-i18n-ignore]")) return;
      const current = element.getAttribute(attribute);
      if (!current) return;

      let values = attributeValues.current.get(element);
      if (!values) {
        values = new Map();
        attributeValues.current.set(element, values);
      }

      const previous = values.get(attribute);
      const source = previous && current === previous.rendered ? previous.source : current;
      const translatable = previous && current === previous.rendered
        ? previous.translatable
        : translateUiText(source, "en") !== source;
      const rendered = translatable ? translateUiText(source, locale) : source;

      values.set(attribute, { source, rendered, translatable });
      if (current !== rendered) element.setAttribute(attribute, rendered);
    }

    function translateElement(element: Element) {
      for (const attribute of localizedAttributes) translateAttribute(element, attribute);

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        translateTextNode(node as Text);
        node = walker.nextNode();
      }

      const selector = localizedAttributes.map((attribute) => `[${attribute}]`).join(",");
      for (const descendant of element.querySelectorAll(selector)) {
        for (const attribute of localizedAttributes) translateAttribute(descendant, attribute);
      }
    }

    translateElement(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
          continue;
        }
        if (mutation.type === "attributes") {
          translateAttribute(mutation.target as Element, mutation.attributeName || "");
          continue;
        }
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType === Node.TEXT_NODE) translateTextNode(addedNode as Text);
          if (addedNode.nodeType === Node.ELEMENT_NODE) translateElement(addedNode as Element);
        }
      }
    });

    observer.observe(root, {
      attributeFilter: [...localizedAttributes],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  return null;
}

function persistLocaleCookie(locale: AppLocale) {
  document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({ children, initialLocale }: Readonly<{ children: React.ReactNode; initialLocale: AppLocale }>) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  const [legacyTranslatorReady, setLegacyTranslatorReady] = useState(false);

  useEffect(() => {
    let savedLocale: string | null = null;
    try {
      savedLocale = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be disabled; switching still works for the current tab.
    }
    const resolvedLocale = resolveLocale(savedLocale, window.navigator.language) as AppLocale;
    if (resolvedLocale === initialLocale) return;

    const timeout = window.setTimeout(() => {
      persistLocaleCookie(resolvedLocale);
      setLocaleState(resolvedLocale);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [initialLocale]);

  useEffect(() => {
    const windowWithIdleCallback = window as typeof window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };
    if (windowWithIdleCallback.requestIdleCallback) {
      const handle = windowWithIdleCallback.requestIdleCallback(
        () => setLegacyTranslatorReady(true),
        { timeout: 1_500 },
      );
      return () => windowWithIdleCallback.cancelIdleCallback?.(handle);
    }

    const timeout = window.setTimeout(() => setLegacyTranslatorReady(true), 100);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  useEffect(() => {
    function syncLocale(event: StorageEvent) {
      if (event.key === STORAGE_KEY && isSupportedLocale(event.newValue)) {
        const nextLocale = event.newValue as AppLocale;
        persistLocaleCookie(nextLocale);
        setLocaleState(nextLocale);
      }
    }

    window.addEventListener("storage", syncLocale);
    return () => window.removeEventListener("storage", syncLocale);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      if (!isSupportedLocale(nextLocale)) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      } catch {
        // Keep the selection in memory when storage is unavailable.
      }
      persistLocaleCookie(nextLocale);
      setLocaleState(nextLocale);
    },
    t(key) {
      return getMessage(locale, key);
    },
    translate(text) {
      return translateUiText(text, locale);
    },
  }), [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {legacyTranslatorReady && <LegacyUiTranslator locale={locale} />}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}

export function LocalizedText({ text }: Readonly<{ text: string }>) {
  const { translate } = useLanguage();
  return <>{translate(text)}</>;
}
