'use client'

import HabitTracker from '../components/habit-tracker'
import { Button } from "../components/ui/button"
import { Plus } from 'lucide-react'
import { useState, useEffect, useRef } from "react"
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { translations, Language } from '../lib/translations'
import { Globe } from 'lucide-react'

interface Habit {
  id: number;
  title: string;
  marked_days?: string[];
}

export default function Page() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null)
  const [newHabitTitle, setNewHabitTitle] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const t = translations[language]
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const loadHabits = async (userId: string) => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading habits:', error)
        return
      }

      setHabits(data || [])
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user
      setUser(currentUser ?? null)
      if (currentUser) {
        loadHabits(currentUser.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user
      setUser(currentUser ?? null)
      if (currentUser) {
        loadHabits(currentUser.id)
      } else {
        setHabits([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    // Directly schedule notifications for testing purposes
    scheduleNotifications()
  }, [])

  const scheduleNotifications = () => {
    const now = new Date()
    const times = [
      { hour: 11, minute: 0 },
      { hour: 20, minute: 0 }
    ]

    times.forEach(({ hour, minute }) => {
      const notificationTime = new Date()
      notificationTime.setHours(hour, minute, 0, 0)

      if (notificationTime < now) {
        notificationTime.setDate(notificationTime.getDate() + 1)
      }

      const timeout = notificationTime.getTime() - now.getTime()
      setTimeout(() => {
        new Notification("Don't forget to mark your habits!")
      }, timeout)
    })
  }

  const removeHabit = async (habitId: number) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing habit:', error)
      return
    }

    setHabits(habits.filter(habit => habit.id !== habitId))
  }

  const renameHabit = async (habitId: number, newTitle: string) => {
    if (!user) return

    const { error } = await supabase
      .from('habits')
      .update({ title: newTitle })
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error renaming habit:', error)
      return
    }

    setHabits((prevHabits) =>
      prevHabits.map((habit) =>
        habit.id === habitId ? { ...habit, title: newTitle } : habit
      )
    )
  }

  const addHabit = async () => {
    if (!newHabitTitle.trim()) return

    const newHabit = {
      id: Date.now(),
      title: newHabitTitle,
      user_id: user?.id || null,
      marked_days: []
    }

    if (user) {
      const { error } = await supabase
        .from('habits')
        .insert(newHabit)

      if (error) {
        console.error('Error adding habit:', error)
        return
      }
    }

    setHabits(prevHabits => [...prevHabits, newHabit])
    setNewHabitTitle("")
    setIsModalOpen(false)
  }

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  const openDeleteModal = (habitId: number) => {
    setHabitToDelete(habitId)
    setIsConfirmDeleteOpen(true)
  }

  const closeDeleteModal = () => {
    setIsConfirmDeleteOpen(false)
    setHabitToDelete(null)
  }

  const confirmDeleteHabit = () => {
    if (habitToDelete !== null) {
      removeHabit(habitToDelete)
    }
    closeDeleteModal()
  }

  const handleLogin = async () => {
    const redirectURL = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/auth/callback`
      : `${window.location.origin}/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectURL
      }
    });
  }

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'es' : 'en'
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }

  const playHoverSound = () => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.currentTime = 0;
      hoverSoundRef.current.play();
    }
  }

  function requestNotificationPermission(event: React.MouseEvent<HTMLButtonElement>): void {
    // Implement your logic here
    console.log('Notification permission requested');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-1">
      <div className="max-w-6xl mx-auto space-y-2">
        {/* Header con Login y Language Selector */}
        <div className="relative flex flex-col items-center pt-4 space-y-2">
          {/* Language Selector */}
          <button
            className="flex items-center space-x-2 text-white text-sm bg-gray-800 bg-opacity-50 px-4 py-1 rounded-lg hover:bg-gray-700 transition-colors"
            onClick={toggleLanguage}
          >
            <Globe className="w-4 h-4" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Login Button */}
          {!user && (
            <button
              className="text-white text-lg font-medium bg-gray-800 bg-opacity-50 px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors shadow-lg hover:scale-105 transform duration-200"
              onClick={handleLogin}
            >
              {t.loginButton}
            </button>
          )}
        </div>

        {/* Title and Description */}
        <div className="text-center space-y-1">
          <h1 className="text-5xl pt-1 font-bold text-white tracking-tight flex items-center justify-center">
            <img 
              src="/images/logo-b-blue.svg" 
              alt="Logo" 
              className="h-12 w-12"
            />
            HabitFast
          </h1>
          <p className="text-xl text-gray-300">{t.subtitle}</p>
        </div>

        {/* Habit Trackers */}
        {habits.map(habit => (
          <HabitTracker
            key={habit.id}
            id={habit.id}
            title={habit.title}
            initialMarkedDays={habit.marked_days || []}
            onRemove={() => openDeleteModal(habit.id)}
            onRename={(newTitle) => renameHabit(habit.id, newTitle)}
            language={language}
          />
        ))}

        {/* Create New Habit Button */}
        <Button 
          className="w-full bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-3xl p-10 shadow-2xl text-white text-2xl font-semibold hover:bg-gray-700 transition-colors duration-300 hover:scale-[1.02] transform mb-12"
          onClick={openModal}
          onMouseEnter={playHoverSound}
        >
          <Plus className="mr-3 h-8 w-8" /> {t.createButton}
        </Button>

        {/* Additional Information */}
        <div className="text-center space-y-2 text-gray-400">
          <p>
            {t.additionalInfo.madeWithLove} <a href="https://linktr.ee/andrewmos" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Andres Mosquera</a>
          </p>
          <p>
            <a href="https://github.com/andresmosqueraw/habitfast-web" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">{t.additionalInfo.openSource}</a>
          </p>
        </div>

        {/* Audio element for hover sound */}
        <audio ref={hoverSoundRef} src="/sounds/hover-sound-effect.mp3" />
      </div>

      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">{t.notifications.enablePromptTitle}</h2>
            <p className="text-gray-300 mb-4">{t.notifications.enablePromptText}</p>
            <button
              onClick={requestNotificationPermission}
              className="w-full px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
            >
              {t.notifications.enableButton}
            </button>
          </div>
        </div>
      )}

      {/* Modal for New Habit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">{t.newHabitTitle}</h2>
            <input
              type="text"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder={t.habitNamePlaceholder}
            />
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={addHabit}
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
              >
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Habit Deletion */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">{t.deleteConfirmTitle}</h2>
            <p className="text-gray-300">{t.deleteConfirmText}</p>
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}