const STATS = [
  { value: 'Karate · BJJ · Taekwondo', label: 'Three martial arts styles' },
  { value: 'Ages 4–16', label: 'Three age-appropriate programs' },
  { value: 'First class FREE', label: 'No commitment, no uniform' },
  { value: 'Month-to-month', label: 'No long-term contracts' },
];

export function TrustStatsBar() {
  return (
    <div className="bg-[#1B1212] text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {STATS.map((stat) => (
            <div key={stat.value} className="py-5 px-4 first:pl-0 last:pr-0">
              <p className="text-sm font-semibold text-white leading-snug">
                {stat.value}
              </p>
              <p className="text-xs text-white/55 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
