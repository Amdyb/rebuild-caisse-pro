import Link from 'next/link'

export default function AmdyLabsBrand() {
  return (
    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
      Propulsé par{' '}
      <Link
        href="https://amdylabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-black bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
      >
        AMDY LABS
      </Link>
    </p>
  )
}
