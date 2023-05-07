import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex flex-col h-full px-12">
      <h1 className="w-1/2 my-auto mr-auto text-3xl font-bold text-right">Добре дошли на това неочаквано място, но то още не е готово за широката публика</h1>
      <Image src="/midjourney-castle.png" className="my-auto ml-auto" width={400} height={400} alt="A castle on a flying island" />
    </main>
  )
}
