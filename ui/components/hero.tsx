export default function Hero() {
  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-4xl font-bold max-w-xl text-center">Create healthy habits and verify your progress</h1>
      <div className="flex flex-col items-center">
        <div className="mt-5">
          Track, improve and proof your health with Grass.
        </div>
        <div className="flex mt-5 gap-5">
          <button className="btn btn-success btn-soft">Touch Grass</button>
        </div>
      </div>
    </div>
  );
}