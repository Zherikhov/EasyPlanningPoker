import React from 'react'

function LoginCard() {
  return (
    <div className="w-full max-w-md bg-[#0f1420]/85 backdrop-blur rounded-xl border border-zinc-800 shadow-2xl p-6">
      {/* Tabs header */}
      <div className="flex items-center gap-6 mb-4">
        <button className="text-zinc-100 font-semibold">Welcome</button>
        <button className="text-zinc-500">Log In</button>
      </div>
      <div className="h-0.5 bg-zinc-800">
        <div className="h-0.5 w-24 bg-indigo-500" />
      </div>

      {/* Form */}
      <form className="mt-6 space-y-4" onSubmit={(e)=>e.preventDefault()}>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
          <div className="relative">
            <input
              type="email"
              required
              className="w-full rounded-md bg-zinc-900/80 border border-zinc-700 pl-3 pr-10 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Email"
            />
            {/* mail icon */}
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" opacity="0"/><path d="M4 8l8 5 8-5"/><rect x="4" y="5" width="16" height="14" rx="2"/></svg>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
          <div className="relative">
            <input
              type="password"
              required
              className="w-full rounded-md bg-zinc-900/80 border border-zinc-700 pl-3 pr-10 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Password"
            />
            {/* lock icon */}
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 rounded border-zinc-600 bg-zinc-800" />
            <span>Remember me</span>
          </label>
        </div>

        <button type="submit" className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md py-2 font-medium shadow">
          Log In
        </button>

        <div className="text-center text-xs mt-2">
          <a href="#" className="text-indigo-400 hover:text-indigo-300">Forget password?</a>
        </div>
      </form>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md p-6 md:p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left hero */}
            <div className="text-zinc-100">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-semibold">Free Planning Poker App</h1>
                <p className="text-zinc-500">Estimate user stories in an Agile/Scrum team collaboratively.</p>
                <p className="text-zinc-600 text-sm leading-relaxed max-w-md">
                  Free / Open source Planning Poker Web App to estimate user stories for Agile/Scrum teams.
                  Create a session and invite your team members to estimate user stories efficiently.
                </p>
                <div>
                  <a href="#" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-gray-700 px-5 py-2 rounded-md shadow">Get Started for Free</a>
                </div>
              </div>

              {/* Illustration from mock for context */}
              <div className="hidden md:block mt-8">
                <img src="/image/dark.png" alt="Иллюстрация" className="w-full max-w-xl rounded-xl border border-zinc-800/70 shadow-2xl" />
              </div>
            </div>

            {/* Right login card */}
            <div className="flex justify-center">
              <LoginCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
