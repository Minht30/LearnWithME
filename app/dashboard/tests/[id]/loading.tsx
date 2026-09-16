import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />
      <header className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="lwm-card p-5">
              <div className="mb-3 flex gap-2">
                <div className="h-5 w-10 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="mb-2 h-5 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="lwm-card h-40 animate-pulse bg-muted/40" />
          <Card className="lwm-card h-56 animate-pulse bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
