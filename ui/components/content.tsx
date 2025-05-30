import Image from "next/image";

export default function Content() {
  return (
    <div className="flex mt-10 gap-5 justify-center items-center">
      <div className="card image-full w-72 shadow-sm">
        <figure>
          <img
            src="/touch-grass.png"
            alt="Shoes" />
        </figure>
        <div className="card-body">
          <h2 className="card-title">Track your progress</h2>
          <p>You can set targets and proof your progress with Grass.</p>
          <div className="card-actions justify-end">
            <button className="btn btn-success btn-soft">Grass up!</button>
          </div>
        </div>
      </div>
      <div className="mt-auto leading-tight flex flex-col gap-5 relative">
        <div className="card bg-success text-success-content w-72">
          <div className="card-body relative">
            <h2 className="card-title text-3xl text-white">+80% <span className="text-xs text-white mt-3.5">steps</span></h2>
            <p className="text-white z-20 font-bold">Since the last week</p>
            <div className="card-actions justify-end z-20">
              <button className="btn btn-success btn-soft">Prove Grass</button>
            </div>
            <Image src="/plant.png" alt="Grass" className="absolute bottom-0 right-0 z-10" width={200} height={200} />
          </div>
        </div>
        <div className="text-right mt-auto leading-tight text-xs absolute -bottom-10 right-2">
          Built with <br /><span className="text-success underline font-bold">vlayer</span>
        </div>
      </div>
    </div>

  )
}