"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    if (session) {
      // Fetch user's boards
      fetch('/api/boards')
        .then(res => res.json())
        .then(data => setBoards(data))
        .catch(console.error);
    }
  }, [session]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <h1 className="text-5xl font-bold mb-4">MyTrello by ACDev</h1>
        <p className="text-xl mb-8">Premium Kanban boards for your team.</p>
        <Link 
          href="/api/auth/signin"
          className="glass-card px-6 py-3 text-lg font-semibold hover:bg-white/20 transition"
        >
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8">
      <header className="flex justify-between items-center mb-8 glass p-4 rounded-lg">
        <h1 className="text-2xl font-bold text-indigo-600">MyTrello</h1>
        <div className="flex gap-4 items-center">
          <span className="font-semibold">{session.user?.name || session.user?.email}</span>
          <Link href="/api/auth/signout" className="text-sm bg-red-500 text-white px-3 py-1 rounded">Sign Out</Link>
        </div>
      </header>
      
      <section>
        <h2 className="text-xl font-bold mb-4">Your Boards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {boards.map((board: any) => (
            <Link href={`/board/${board.id}`} key={board.id} className="glass-card p-6 h-32 flex items-center justify-center">
              <span className="text-lg font-bold">{board.title}</span>
            </Link>
          ))}
          <div className="glass-card p-6 h-32 flex items-center justify-center cursor-pointer border-dashed border-2 border-indigo-300 hover:border-indigo-500">
            <span className="text-lg text-indigo-500 font-bold">+ Create New Board</span>
          </div>
        </div>
      </section>
    </main>
  );
}
