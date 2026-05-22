import Mark from "@/app/components/UI/Mark";
import { BackButton } from "@/components/BackButton";

export default function TitleBar({
  title,
  buttons,
  total,
}: {
  title: string;
  backURL?: string;
  buttons?: React.ReactNode;
  total?: number;
}) {
  return (
    <div className="titleBar mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Mark title={`${title} ${total ? `(${total})` : ""}`} tag="h1" />
      <div className="flex items-center gap-2">
        {buttons}
        <BackButton />
        {/* <Route path={backURL} text={"Volver"} clase="btn-secondary-outline" /> */}
      </div>
    </div>
  );
}
