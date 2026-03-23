I have addressed the unresponsive hamburger menu issue. Here's a summary of the changes made:

**1. `index.html`:**
*   **Removed the inline JavaScript block** containing mobile navigation and an erroneous modal logic.
*   **Added a script tag to link `assets/js/main.js`** at the end of the `<body>`, ensuring consistent behavior with other pages.
*   **Corrected invalid JSON in the `ld+json` script** by removing `onclick` attributes from the `sameAs` array.

**2. `style.css`:**
*   **Updated the CSS rule** `.mobile-nav.is-open .mobile-nav__panel` to `.mobile-nav.open .mobile-nav__panel` to align with the class (`open`) toggled by `assets/js/main.js` for the mobile menu panel animation.

These changes centralize JavaScript logic, remove potential errors, and ensure consistency across the site. The hamburger menu should now be responsive.
