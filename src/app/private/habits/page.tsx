import type { Metadata } from "next";
import HabitsApp from "./HabitsApp";

export const metadata: Metadata = {
  title: "Habits",
};

export default function HabitsPage() {
  return <HabitsApp />;
}
