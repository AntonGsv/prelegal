export default function Home() {
  // PL-4 introduces a signed-in shell. The landing page is now the
  // dashboard; this entry component just renders an empty container
  // because the AuthGate will redirect to `/login` or `/dashboard`
  // based on the `localStorage` flag. Keeping a thin page here avoids
  // touching the marketing copy until product work resumes.
  return null;
}