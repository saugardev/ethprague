import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="flex justify-between items-center">
        <Link href="/" className="flex items-center w-32">
          <div className="title">Grass</div>
          <Image src="/logo.png" alt="logo" width={28} height={28} />
        </Link>

        <div className="flex gap-10">
          <Link href="/social" className="btn btn-ghost">Social</Link>
          <Link href="/train" className="btn btn-ghost">Train</Link>
          <Link href="/health" className="btn btn-ghost">Health</Link>
        </div>

        <div className="w-32">
          <button className="btn btn-success btn-soft">Touch Grass</button>
        </div>
      </div>
    </div>
  );
}