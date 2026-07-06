import { redirect } from "next/navigation";
import { loginUrl } from "@/lib/site";

export const metadata = { title: "Login" };

export default function Page() {
  redirect(loginUrl);
}
