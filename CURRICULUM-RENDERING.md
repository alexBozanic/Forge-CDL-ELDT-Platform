# Curriculum rendering compatibility

Incoming lessons use second/third-level headings, bold emphasis and numbered
steps. The prior minimal renderer displayed those Markdown markers as text.
The renderer now emits semantic headings, strong emphasis and ordered lists.
Raw HTML remains escaped by React; scripts, images and arbitrary links are not
interpreted. No new dependency was introduced.

Blank-line block splitting is unchanged, preserving stored resume positions.
The legacy single-# heading still renders as h2 beneath the page's h1.
Three regressions cover formatting, hostile-markup escaping and resume blocks.
The application suite now has 80 tests. Database/RLS and publication guards are
unchanged; this display change does not import or approve curriculum.

The user confirmed instructor approval of the supplied question and lesson
packages on September 19, 2026. That approval is recorded separately from the
unchanged source artifacts. Course import, exam configuration and hosted
publication are separate operations. No private bank or answer keys are committed.
