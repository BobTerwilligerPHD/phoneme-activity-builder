export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
      <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-16 sm:mb-20">
        CSE3CWA Assessment 2: About the Phoneme Activity Builder
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-12 mb-14 sm:mb-16">
        <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-text)] sm:w-40 shrink-0">
          What it does
        </span>
        <p className="text-lg leading-relaxed max-w-xl">
          It&apos;s a tool for Speech Pathology teachers to build classroom activities
          using phoneme symbols instead of normal spelling, since that&apos;s what
          actually matters for sound production and awareness. There are two
          activities, a Wordle-style guesser and a phoneme Word Search. Both can
          be previewed in the browser and downloaded as standalone HTML files
          generated from stored data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-12 mb-14 sm:mb-16">
        <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-text)] sm:w-40 shrink-0">
          Project scope
        </span>
        <p className="text-lg leading-relaxed max-w-xl">
          This Assessment 2 application uses a Next.js backend with Prisma and
          SQLite to store word lists, ordered phonemes and activity configurations.
          Teachers can manage that stored data and use it to generate Wordle and
          Word Search activities.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-12 mb-14 sm:mb-16">
        <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-text)] sm:w-40 shrink-0">
          How to use it
        </span>
        <div className="max-w-xl w-full">
          <p className="text-lg leading-relaxed mb-4">Below is a short video on how to use the site.</p>
          <div className="aspect-video border border-[var(--foreground)]">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/EGL9XFrjlFY"
              title="How to use the Phoneme Activity Builder"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-12">
        <span className="text-xs font-semibold tracking-widest uppercase text-[var(--accent-text)] sm:w-40 shrink-0">
          Author
        </span>
        <p className="text-lg leading-relaxed">
          Nicholas Farley
          <br />
          Student ID: 20962824
        </p>
      </div>
    </div>
  );
}
