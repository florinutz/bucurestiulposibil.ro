import Image from "next/image";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-lg p-8 mx-auto bg-gray-800 rounded-lg shadow-lg min-w-[300px] min-h-[200px] flex flex-col items-center justify-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <p className="mt-4 text-center text-gray-400">
          This is a custom, screen-wide container.
        </p>
      </div>
    </div>
  );
}