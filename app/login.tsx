// File: app/login.tsx
"use client"

import Image from "next/image"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EyeIcon, EyeOffIcon, UserIcon, LockIcon } from "lucide-react"

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    // Check credentials
    if (username === "Admin" && password === "Admin@123") {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsLoading(false)
      onLogin()
    } else {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsLoading(false)
      setError("Invalid username or password.")
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute w-full h-full object-cover">
        <source
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20(1)-wfrgGmlAyncGd58P1J1MvVE5Wsxds5.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <Card className="w-[90%] max-w-md p-4 sm:p-6 rounded-2xl relative z-10 bg-white/90 backdrop-blur-sm">
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_cresol%20(5)-YuOOsUQjnFH4cLQWJWAm0hxlK2UYQ9.png"
              alt="Cresol Logo"
              width={150}
              height={40}
              className="h-8 sm:h-10 w-auto"
              priority
            />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#4F46E5]">Welcome Back</h1>
            <p className="text-sm sm:text-base text-gray-600">Your private AI Chatbot</p>
          </div>

          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                name="username"
                type="text"
                placeholder="Enter your username"
                className="pl-10"
                required
                disabled={isLoading}
              />
              <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10"
                required
                disabled={isLoading}
              />
              <LockIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white py-4 sm:py-6"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 left-0 right-0 text-center z-10">
        <div className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
          <span className="text-xs sm:text-sm text-white font-medium mr-2">Powered by</span>
          <a
            href="https://cresol.ai"
            className="text-xs sm:text-sm font-bold text-white hover:text-indigo-200 transition-colors duration-300"
          >
            Cresol.ai
          </a>
        </div>
      </div>
    </div>
  )
}
