import { LockKeyhole } from "lucide-react";

export default function ServiceSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl sm:p-9">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Servicio suspendido</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          El acceso a Carne &amp; Legumbre está suspendido temporalmente. Comunícate
          con la administración para reactivarlo.
        </p>
      </section>
    </main>
  );
}
