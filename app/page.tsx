import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Frost Collective Consciousness</h1>
        <p className="text-gray-400 mb-8">Multi-agent consensus system</p>
        <Link
          href="/fcc"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-block"
        >
          Open FCC Interface
        </Link>
      </div>
    </div>
  );
}

