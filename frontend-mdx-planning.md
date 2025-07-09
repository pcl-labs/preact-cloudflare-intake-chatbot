# Frontend MDX Planning

## Goal
- Create a desktop layout similar to ChatGPT: chat column (main) + right sidebar (persistent)
- Sidebar will always display:
  - The latest case summary (markdown/MDX, not editable from sidebar)
  - A horizontal row of file thumbnails (like Facebook sidebar) for all files uploaded in the current session/case
  - A timeline/history of previous case summaries or major case events, with the most recent at the bottom
- On mobile, sidebar should collapse or become accessible via a right slide-out drawer
- Use Preact best practices: introduce a layout file/component to manage the two-column structure

## Current State
- The CaseCanvas component is rendered inline as a message in the chat flow
- There is no dedicated layout or container for a sidebar
- All main structure is in `src/index.tsx` (App), with chat and messages handled by VirtualMessageList and Message
- No existing layout file/component for multi-column or sidebar structure
- Styles are present for chat-container, but not for a sidebar

## Updated Plan
1. **Create a new Layout Component**
   - Handles desktop two-column (chat + sidebar) and mobile single-column (with right slide-out)
   - Place chat in the main column, and CaseCanvas (or future MDX) in the sidebar
   - Use CSS grid or flexbox for responsive layout
2. **Sidebar Content**
   - **Top:** Latest case summary (markdown/MDX, not editable from sidebar)
   - **Middle:** Row of file thumbnails (clickable, like Facebook sidebar)
   - **Bottom:** Timeline/history of previous case summaries or major case events (most recent at the bottom)
   - On mobile: sidebar hidden by default, accessible via a right slide-out drawer
3. **MDX/Markdown Support**
   - Continue using markdown for case summary (as in CaseCanvas)
   - Consider MDX if we want interactive components in the sidebar in the future
4. **Integration**
   - Refactor App to use the new Layout component
   - Pass case summary/canvas data, file list, and timeline to sidebar as they update
   - Remove inline CaseCanvas from chat flow on desktop (keep for mobile if needed)
5. **Styling**
   - Add sidebar styles, sticky positioning, responsive breakpoints
   - Ensure accessibility and good UX on all screen sizes

## Mobile UX
- Sidebar is hidden by default and accessible via a right slide-out drawer
- When opened, shows the same content as desktop: latest case summary, file thumbnails, and timeline
- Chat column remains the main view; sidebar overlays or slides over the chat when opened

## Data Storage: Current, Best Practice, and Recommendation
### How Storage Works Today
- **Case summaries & timeline:** Stored as markdown/MDX blobs (JSON) in D1, associated with case/session. Timeline/history is reconstructed by querying D1 for all relevant records.
- **File uploads:** Files are stored in Cloudflare R2. Metadata (file name, type, size, upload time, session/case ID) is stored in D1. App retrieves file lists and download URLs by querying D1 for metadata and then accessing the file in R2.

### Cloudflare Best Practice
- **D1:** For all structured, queryable, relational data (case summaries, timeline/history, status, metadata, etc.). Store each summary or timeline event as a row with type, timestamp, and markdown/MDX content. Use D1’s relational features to link all data to cases/sessions for easy querying and history.
- **R2:** For all large, unstructured, or binary data (file uploads, large MDX files if needed). Store only metadata and references (file name, type, R2 key, etc.) in D1.
- **KV:** For ephemeral/session data (chat sessions, temporary state, caching).

### Recommendation for This App
- **Continue storing case summaries, timeline, and status as markdown/MDX blobs in D1.**
- **Store all file uploads in R2, with metadata in D1.**
- **If you ever need to store very large or binary MDX files, use R2 and reference them from D1.**
- **Use D1’s relational features to link all data to cases/sessions for easy querying and history.**

## Open Questions
- What events should be included in the timeline (just case summaries, or also file uploads, major chat milestones, etc.)?
- Should file previews support all file types, or just images/docs?
- Should the sidebar be resizable on desktop?

## Next Steps
- Review all chat/canvas rendering logic in App, VirtualMessageList, Message, and CaseCanvas
- Design the Layout component API and props
- Plan the data flow for live-updating the sidebar
- Discuss/decide on mobile sidebar UX
- Finalize data storage approach for case summaries and timeline

---

*This file is for planning and discussion. No code changes yet.* 