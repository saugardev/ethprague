import Hero from "@/components/hero";
import Link from "next/link";

export default function Health() {
  return (
    <>
      <Hero 
        title="Verify your health status with data"
        subtitle="Prove you are healthy or document health conditions using verified metrics."
        ctaText="Create Health Proof"
        showCta={true}
      />
      
      <div className="flex mt-10 gap-5 justify-center items-center">
        <Link href="/health/verify" className="card image-full dark w-72 h-80 shadow-sm hover:shadow-lg transition-shadow">
          <figure>
            <img
              src="/health-check.jpg"
              alt="Health Verification"
              className="w-full h-full object-cover"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-white">Health Verification</h3>
            <p className="text-white/80">Create verifiable health proofs using sleep, heart rate, fitness age and more.</p>
            <div className="card-actions justify-end">
              <div className="btn btn-success btn-soft">Verify Health →</div>
            </div>
          </div>
        </Link>
        
        <div className="mt-auto leading-tight flex flex-col gap-5 relative">
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Wellness Proof</h3>
              <p className="text-base-content/70">Demonstrate optimal health with verified metrics from Grass data.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Create Proof</div>
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Medical Documentation</h3>
              <p className="text-base-content/70">Document health conditions or recovery with timestamped health data.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Document Health</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 