import Hero from "@/components/hero";
import Link from "next/link";

export default function Social() {
  return (
    <>
      <Hero 
        title="Connect with like-minded health enthusiasts"
        subtitle="Find and connect with people who share your goals."
        ctaText="Join groups"
        showCta={true}
      />
      
      <div className="flex mt-10 gap-5 justify-center items-center">
        <Link href="/social/groups" className="card image-full dark w-72 h-80 shadow-sm hover:shadow-lg transition-shadow">
          <figure>
            <img
              src="/group.jpg"
              alt="Health & Fitness Groups"
              className="w-full h-full object-cover"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-white">Health & Fitness Groups</h3>
            <p className="text-white/80">Join communities based on your health metrics and fitness goals.</p>
            <div className="card-actions justify-end">
              <div className="btn btn-success btn-soft">View Groups →</div>
            </div>
          </div>
        </Link>
        
        <div className="mt-auto leading-tight flex flex-col gap-5 relative">
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Friends & Connections</h3>
              <p className="text-base-content/70">Connect with friends and track progress together.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Coming Soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}