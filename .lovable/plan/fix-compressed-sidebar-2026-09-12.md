# Fix compressed sidebar

## Changes
- Prevent text and controls from being accidentally selected while the sidebar is resized.
- Collapse the sidebar completely when it is dragged below a usable width, instead of leaving a squeezed copy visible.
- Keep the existing “Show chat” control available so the sidebar can be restored.
- Verify the behavior at desktop and narrow screen sizes.

## Technical details
- Clear browser text selection when resizing starts and temporarily disable selection until resize ends.
- Use a collapse threshold while dragging, with a safe minimum width for the expanded sidebar.
- Handle pointer cancellation as well as pointer release so resizing cannot remain stuck.