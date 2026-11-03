/* Updated with accessible theme/language toggles, localization, RTL handling, and existing page interactions. */
(function () {
    "use strict";

    const color = name => `rgb(var(--${name}-rgb) / <alpha-value>)`;

    window.tailwind = window.tailwind || {};
    window.tailwind.config = {
        darkMode: "class",
        theme: {
            extend: {
                colors: {
                    primary: color("primary"),
                    secondary: color("secondary"),
                    tertiary: color("tertiary"),
                    background: color("background"),
                    surface: color("surface"),
                    "surface-container-low": color("surface-container-low"),
                    "surface-container-lowest": color("surface-container-lowest"),
                    "surface-container": color("surface-container"),
                    "surface-container-high": color("surface-container-high"),
                    "surface-container-highest": color("surface-container-highest"),
                    "surface-bright": color("surface-bright"),
                    "on-surface": color("on-surface"),
                    "on-surface-variant": color("on-surface-variant"),
                    "on-primary": "#160812",
                    "on-secondary": "#001a15",
                    "on-tertiary": "#1a1000",
                    outline: color("outline"),
                    "outline-variant": color("outline-variant"),
                    "surface-tint": color("primary"),
                    "primary-container": color("primary"),
                    "secondary-container": color("secondary"),
                    "tertiary-container": color("tertiary"),
                    "inverse-surface": color("on-surface"),
                    "inverse-primary": color("primary"),
                    error: "#d92d3f",
                    "error-container": "#7f1d2a"
                },
                fontFamily: {
                    headline: ["Orbitron", "sans-serif"],
                    display: ["Orbitron", "sans-serif"],
                    body: ["Rajdhani", "sans-serif"],
                    label: ["Rajdhani", "sans-serif"]
                }
            }
        }
    };

    const languageResources = {
        en: window.siteTranslationsEn || {},
        ar: window.siteTranslationsAr || {}
    };

    function readPreference(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            console.warn(`Unable to read the ${key} preference from localStorage.`, error);
            return null;
        }
    }

    function savePreference(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Unable to save the ${key} preference to localStorage.`, error);
        }
    }

    const savedTheme = readPreference("smartland-theme");
    const initialTheme = savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    document.documentElement.dataset.theme = initialTheme;
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const savedLanguage = readPreference("smartland-language");
    const initialLanguage = savedLanguage === "ar" ? "ar" : "en";
    document.documentElement.lang = initialLanguage;
    document.documentElement.dir = initialLanguage === "ar" ? "rtl" : "ltr";

    document.addEventListener("DOMContentLoaded", function () {
        const root = document.documentElement;
        const themeButton = document.getElementById("theme-toggle");
        const themeLabel = document.getElementById("theme-toggle-label");
        const themeIcon = themeButton && themeButton.querySelector(".material-symbols-outlined");
        const languageButton = document.getElementById("language-toggle");
        const languageLabel = document.getElementById("language-toggle-label");
        let currentTheme = root.dataset.theme;
        let currentLanguage = root.lang;
        let pendingLanguage = currentLanguage;
        let languageTransitionTimer = null;
        const mirroredIconNames = new Set(["arrow_forward", "chevron_right", "north_east"]);
        const translatedNodes = [];
        const caseDialog = document.getElementById("case-dialog");
        let selectedCase = null;

        function gatherTextNodes() {
            document.querySelectorAll("[data-i18n-key]").forEach(element => {
                translatedNodes.push({ key: element.dataset.i18nKey, element, originalText: element.textContent });
            });
        }

        function translatedValue(language, key, fallback) {
            return languageResources[language][key] || fallback;
        }

        function applyLocale(language, persist = false) {
            currentLanguage = language;
            root.lang = language;
            root.dir = language === "ar" ? "rtl" : "ltr";
            document.querySelectorAll(".material-symbols-outlined").forEach(icon => {
                icon.classList.toggle(
                    "rtl-mirror-icon",
                    language === "ar" && mirroredIconNames.has(icon.textContent.trim())
                );
            });

            translatedNodes.forEach(item => {
                if (!item.element) return;
                const leading = item.originalText.match(/^\s*/)[0];
                const trailing = item.originalText.match(/\s*$/)[0];
                const fallback = item.originalText.trim();
                item.element.textContent = leading + translatedValue(language, item.key, fallback) + trailing;
            });

            const strings = languageResources[language];
            document.title = strings["meta.title"] || "Smart Land | AI Systems & Digital Solutions";
            document.querySelectorAll("img").forEach(image => {
                const altKey = image.dataset.i18nAlt;
                if (altKey && strings[`alt.${altKey}`]) image.alt = strings[`alt.${altKey}`];
            });

            document.querySelectorAll("[data-i18n-aria]").forEach(element => {
                const ariaKey = element.dataset.i18nAria;
                if (strings[`aria.${ariaKey}`]) element.setAttribute("aria-label", strings[`aria.${ariaKey}`]);
            });

            if (themeButton && themeLabel) {
                const nextTheme = currentTheme === "dark" ? "light" : "dark";
                themeLabel.textContent = strings[`theme.${nextTheme}Label`];
                const action = strings[`theme.${nextTheme}Action`];
                themeButton.setAttribute("aria-label", action);
                themeButton.title = action;
            }

            if (languageButton && languageLabel) {
                const nextLanguage = language === "en" ? "ar" : "en";
                languageLabel.textContent = strings[`language.${nextLanguage}Label`];
                const action = strings[`language.${nextLanguage}Action`];
                languageButton.setAttribute("aria-label", action);
                languageButton.title = action;
            }

            const description = document.querySelector('meta[name="description"]');
            if (description && strings["meta.description"]) {
                description.content = strings["meta.description"];
            }

            document.querySelectorAll("video").forEach(video => {
                const selectCaptions = () => {
                    for (const track of video.textTracks) {
                        track.mode = track.language === currentLanguage ? "showing" : "disabled";
                    }
                };
                selectCaptions();
                if (video.readyState < 1) video.addEventListener("loadedmetadata", selectCaptions, { once: true });
            });
            if (caseDialog && caseDialog.open) updateCase();
            if (persist) savePreference("smartland-language", language);
        }

        function applyTheme(theme, persist = true) {
            currentTheme = theme;
            root.dataset.theme = theme;
            root.classList.toggle("dark", theme === "dark");
            if (themeIcon) themeIcon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
            applyLocale(currentLanguage);
            if (persist) savePreference("smartland-theme", theme);
        }

        gatherTextNodes();
        applyLocale(currentLanguage);
        applyTheme(currentTheme, false);

        if (languageButton) {
            languageButton.addEventListener("click", function () {
                document.body.classList.add("is-switching");
                pendingLanguage = pendingLanguage === "en" ? "ar" : "en";
                window.clearTimeout(languageTransitionTimer);
                languageTransitionTimer = window.setTimeout(function () {
                    applyLocale(pendingLanguage, true);
                    pendingLanguage = currentLanguage;
                    document.body.classList.remove("is-switching");
                }, 120);
            });
        }

        if (themeButton) {
            themeButton.addEventListener("click", function () {
                applyTheme(currentTheme === "dark" ? "light" : "dark");
            });
        }

        const filterButtons = document.querySelectorAll(".portfolio-filter-btn");
        const portfolioCards = document.querySelectorAll(".portfolio-item");

        filterButtons.forEach(button => {
            const active = button.getAttribute("data-category") === "all";
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        filterButtons.forEach(button => {
            button.addEventListener("click", function () {
                const category = button.getAttribute("data-category");

                filterButtons.forEach(filterButton => {
                    const active = filterButton === button;
                    filterButton.classList.toggle("is-active", active);
                    filterButton.setAttribute("aria-pressed", String(active));
                });

                portfolioCards.forEach(card => {
                    card.classList.toggle(
                        "hidden-card",
                        category !== "all" && card.getAttribute("data-cat") !== category
                    );
                });
            });
        });

        function updateCase() {
            if (!selectedCase) return;
            const strings = languageResources[currentLanguage];
            ["title", "description", "challenge", "solution", "outcome"].forEach(field => {
                document.getElementById(`case-${field}`).textContent = strings[`case.${selectedCase}.${field}`];
            });
        }
        document.querySelectorAll("[data-case]").forEach(link => {
            link.addEventListener("click", event => {
                event.preventDefault();
                selectedCase = link.dataset.case;
                updateCase();
                caseDialog.showModal();
            });
        });
        caseDialog.addEventListener("click", event => {
            if (event.target !== caseDialog) return;
            const rect = caseDialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) caseDialog.close();
        });

        if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.08 });

            document.querySelectorAll("main section, footer").forEach(section => {
                section.classList.add("reveal-on-scroll");
                observer.observe(section);
            });
        }
    });
})();
