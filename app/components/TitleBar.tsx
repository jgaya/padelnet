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
    <div className="mb-4 flex items-center justify-between titleBar">
      <Mark title={`${title} ${total ? `(${total})` : ""}`} tag="h1"></Mark>
      <div className="d-flex">
        {buttons}
        <BackButton />
        {/* <Route path={backURL} text={"Volver"} clase="btn-secondary-outline" /> */}
      </div>
    </div>
  );
}
