'use client'

import HabitTracker from '../components/habit-tracker'
import { Button } from "../components/ui/button"
import { Plus } from 'lucide-react'
import { useState, useEffect } from "react"
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
  const t = translations[language]

  // Cargar hábitos al iniciar sesión
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
  }, [])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-1">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header con Login y Language Selector */}
        <div className="relative flex justify-center pt-4">
          {/* Login Button */}
          {!user && (
            <button
              className="text-white text-lg font-medium bg-gray-800 bg-opacity-50 px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors shadow-lg hover:scale-105 transform duration-200"
              onClick={handleLogin}
            >
              {t.loginButton}
            </button>
          )}
          
          {/* Language Selector */}
          <button
            className="absolute right-0 top-4 flex items-center space-x-2 text-white text-sm bg-gray-800 bg-opacity-50 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            onClick={toggleLanguage}
          >
            <Globe className="w-4 h-4" />
            <span>{language.toUpperCase()}</span>
          </button>
        </div>

        {/* Title and Description */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl pt-3 font-bold text-white tracking-tight">HabitFast</h1>
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
          className="w-full bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-3xl p-10 shadow-2xl text-white text-2xl font-semibold hover:bg-gray-700 transition-colors duration-300 hover:scale-[1.02] transform"
          onClick={openModal}
        >
          <Plus className="mr-3 h-8 w-8" /> {t.createButton}
        </Button>
      </div>

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