# Security Policy

## Reporting a Vulnerability

Privately notify the maintainers with reproduction steps and the impact scope. If there is no private contact channel, include only the impact scope and a way to contact you in a public issue. Do not disclose exploitable inputs or attack code publicly.

## DOM Rendering

Render user-provided messages with `textContent`. Do not insert user input as HTML when adding new effects. Preserve color input validation and cleanup of the DOM, timers, and listeners in `destroy()`.

The library and demo do not use server-side storage, accounts, analytics scripts, or local storage.
