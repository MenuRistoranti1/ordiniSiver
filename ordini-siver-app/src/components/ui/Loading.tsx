type Props = {
  title?: string
}

export default function Loading({
  title = "Caricamento...",
}: Props) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="rounded-3xl border border-slate-200 bg-white px-10 py-8 shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="text-center text-sm font-bold text-slate-600">
          {title}
        </p>
      </div>
    </div>
  )
}