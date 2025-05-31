import Hero from "@/components/hero";
import Link from "next/link";

export default function Train() {
  return (
    <>
      <Hero 
        title="Set and achieve your fitness targets"
        subtitle="Create verifiable training goals tracked through your health metrics."
        ctaText="Create Target"
        showCta={true}
      />
      
      <div className="flex mt-10 gap-5 justify-center items-center">
        <Link href="/train/targets" className="card image-full dark w-72 h-80 shadow-sm hover:shadow-lg transition-shadow">
          <figure>
            <img
              src="/workout.jpg"
              alt="Training Targets"
              className="w-full h-full object-cover"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-white">Training Targets</h3>
            <p className="text-white/80">Set measurable fitness goals using sleep, steps, heart rate, and more.</p>
            <div className="card-actions justify-end">
              <div className="btn btn-success btn-soft">Create Target →</div>
            </div>
          </div>
        </Link>
        
        <div className="mt-auto leading-tight flex flex-col gap-5 relative">
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Progress Tracking</h3>
              <p className="text-base-content/70">Monitor your achievements with verified health data from Grass.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">View Progress</div>
              </div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-sm w-72">
            <div className="card-body">
              <h3 className="card-title">Metric Verification</h3>
              <p className="text-base-content/70">Targets verified through sleep score, steps, calories, heart rate & more.</p>
              <div className="card-actions justify-end">
                <div className="btn btn-outline btn-sm">Learn More</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}