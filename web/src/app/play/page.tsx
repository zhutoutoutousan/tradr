import { redirect } from "next/navigation";

// The game now lives at the root. Keep /play working as an alias.
export default function PlayPage() {
  redirect("/");
}
