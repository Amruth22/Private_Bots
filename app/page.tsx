// File: app/page.tsx
"use client"

import { useRouter } from "next/navigation"
import LoginPage from "./login"
import { useEffect, useState } from "react"

export default function Home() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is already logged in (e.g., via localStorage)
    const loggedIn = localStorage.getItem("isLoggedIn")
    if (loggedIn === "true") {
      setIsLoggedIn(true)
      router.push("/chat")
    }
  }, [router])

  const handleLogin = () => {
    // Set login state in localStorage
    localStorage.setItem("isLoggedIn", "true")
    setIsLoggedIn(true)
    router.push("/chat")
  }

  return isLoggedIn ? null : <LoginPage onLogin={handleLogin} />
}
