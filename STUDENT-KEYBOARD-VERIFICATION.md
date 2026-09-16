# Student keyboard and completed-course review

The user signed in as `student1@forge.example.invalid`; the dashboard confirmed
that identity. Tab and Enter opened the student school workspace and profile.
The profile tab sequence reached the school return link, first/middle/last names,
native date control segments, permit, jurisdiction, and Save button. Values were
not changed or submitted. Keyboard navigation also opened the completed course.

That course displayed Resume learning from historical progress even though its
enrollment was completed. The lesson route requires an active enrollment and
the completed course's lesson outline was empty. The overview now offers lesson
navigation only for an active enrollment and a lesson visible in its current
manifest query. It explains unavailable lesson content and links to the school
workspace and dashboard. Completion and lesson timestamps use explicit UTC;
reporting readiness is labeled as the historical value at completion.

Assessment retakes are intentionally preserved: migration 006's attempt-start
function permits both active and completed enrollments. No new attempt, lesson
interaction, or profile save was performed during this review. No RLS/auth rule,
migration, published content, completion snapshot, or dependency changed.

This is a keyboard check of the recorded paths, not a full screen-reader audit.
Active lesson/assessment form interaction still needs an appropriate active fake
enrollment; the existing completed record must not be reset to create one.
