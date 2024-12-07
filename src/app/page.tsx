'use client'

import HabitTracker from '../components/habit-tracker'
import { Button } from "../components/ui/button"
import { Plus } from 'lucide-react'
import { useState, useEffect } from "react"
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

export default function Page() {
  const [habits, setHabits] = useState([
    { id: 1, title: "Ir al gym" }
  ])
  const [isModalOpen, setIsModalOpen] = useState(false) // Estado para controlar el pop-up
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false) // Estado para el modal de confirmación de eliminación
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null) // ID del hábito a eliminar
  const [newHabitTitle, setNewHabitTitle] = useState("") // Estado para el nuevo hábito
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Verificar el estado de autenticación inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Suscribirse a cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const removeHabit = (habitId: number) => {
    setHabits(habits.filter(habit => habit.id !== habitId)) // Eliminar el hábito con el id correspondiente
  }

  const renameHabit = (habitId: number, newTitle: string) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) =>
        habit.id === habitId ? { ...habit, title: newTitle } : habit
      )
    )
  }

  const addHabit = () => {
    if (newHabitTitle.trim()) {
      const newHabit = { id: Date.now(), title: newHabitTitle }
      setHabits(prevHabits => [...prevHabits, newHabit]) // Agregar el nuevo hábito
      setNewHabitTitle("") // Limpiar el input
      setIsModalOpen(false) // Cerrar el pop-up
    }
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Login/Register Section - Solo mostrar si no hay usuario */}
        {!user && (
          <div className="text-center py-4">
            <button
              className="text-white text-sm font-medium bg-gray-800 bg-opacity-50 px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              onClick={handleLogin}
            >
              Regístrate o Inicia sesión para guardar tu progreso
            </button>
          </div>
        )}

        {/* Title and Description */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">HabitFast</h1>
          <p className="text-xl text-gray-300">Change Your Life One Habit at a Time</p>
        </div>

        {/* Habit Trackers */}
        {habits.map(habit => (
          <HabitTracker
            key={habit.id}
            title={habit.title}
            onRemove={() => openDeleteModal(habit.id)}
            onRename={(newTitle) => renameHabit(habit.id, newTitle)} // Arreglar `onRename`
          />
        ))}

        {/* Create New Habit Button */}
        <Button 
          className="w-full bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-3xl p-8 shadow-2xl text-white text-xl font-semibold hover:bg-gray-700 transition-colors duration-300"
          onClick={openModal}
        >
          <Plus className="mr-2 h-6 w-6" /> Create
        </Button>
      </div>

      {/* Modal for New Habit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Nuevo Hábito</h2>
            <input
              type="text"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ingresa el nombre del hábito"
            />
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addHabit}
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Habit Deletion */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">¿Estás seguro?</h2>
            <p className="text-gray-300">Estás a punto de eliminar este hábito. ¿Quieres continuar?</p>
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}