import { LaunchProps } from "@raycast/api";
import { ChoiceList } from "./components";

type QuickAddWithTextArguments = {
  text?: string;
};

export default function Command(props: LaunchProps<{ arguments?: QuickAddWithTextArguments; fallbackText?: string }>) {
  const text = props.arguments?.text || props.fallbackText || "";
  return <ChoiceList initialText={text} directSend />;
}
