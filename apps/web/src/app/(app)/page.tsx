import { Catalogue } from "./_components/catalogue";
import { ChatComposer } from "./_components/chat-composer";
import { MyDesignsStrip } from "./_components/my-designs-strip";

export default function DashboardPage() {
  return (
    <>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 pb-24">
        <MyDesignsStrip />
        <Catalogue />
      </div>
      <ChatComposer />
    </>
  );
}
