'use client'

import HabitTracker from '../components/habit-tracker'
import { Button } from "../components/ui/button"
import { Plus } from 'lucide-react'
import { useState } from "react"

export default function Page() {
  const [habits, setHabits] = useState([
    { id: 1, title: "Ir al gym" },
    { id: 2, title: "Leer 30 minutos" }
  ])

  const removeHabit = (habitId: number) => {
    setHabits(habits.filter(habit => habit.id !== habitId)) // Eliminar el hábito con el id correspondiente
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Title and Description */}
        <div className="text-center space-y-2 py-8">
          <h1 className="text-5xl font-bold text-white tracking-tight">HabitFast</h1>
          <p className="text-xl text-gray-300">Change Your Life One Habit at a Time</p>
        </div>

        {/* Habit Trackers */}
        {habits.map(habit => (
          <HabitTracker key={habit.id} title={habit.title} onRemove={() => removeHabit(habit.id)} />
        ))}

        {/* Create New Habit Button */}
        <Button 
          className="w-full bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-3xl p-8 shadow-2xl text-white text-xl font-semibold hover:bg-gray-700 transition-colors duration-300"
        >
          <Plus className="mr-2 h-6 w-6" /> Create
        </Button>
      </div>
    </div>
  )
}