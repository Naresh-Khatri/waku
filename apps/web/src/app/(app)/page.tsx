import { Catalogue } from "./_components/catalogue";
import { ChatComposer } from "./_components/chat-composer";
import { MyDesignsStrip } from "./_components/my-designs-strip";

export default function DashboardPage() {
  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-10 pb-40">
        <MyDesignsStrip />
        <Catalogue />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center"
      >
        <div className="relative h-48 w-full max-w-7xl">
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{
              WebkitMaskImage:
                "linear-gradient(to top, black 30%, transparent 100%)",
              maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-[#05070d]/70 to-transparent" />
        </div>
      </div>
      <ChatComposer />
    </>
  );
}
