type Option = {
  label: string
  value: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
}

export default function FilterSelect({
  value,
  onChange,
  options,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-blue-600"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}