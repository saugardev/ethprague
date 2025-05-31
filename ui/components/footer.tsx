import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer>
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <div className="title">Grass</div>
            <Image src="/logo.png" alt="logo" width={28} height={28} />
          </Link>
          
          <div className="flex gap-6 text-gray-600 text-xs">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 