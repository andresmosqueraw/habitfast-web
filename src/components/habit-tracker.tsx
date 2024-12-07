'use client'

import { useState, useRef } from "react"
import { Check, Trash2 } from 'lucide-react' // Importar el ícono de eliminar (Trash2)
import confetti from 'canvas-confetti'

const DAYS_OF_WEEK = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MONTHS = ['EN', 'FB', 'MR', 'AB', 'MY', 'JN', 'JL', 'AG', 'SP', 'OC', 'NV', 'DC']
const ROWS = 7

function formatDate(date: Date): string {
  const month = MONTHS[date.getMonth()]
  const dayOfWeek = DAYS_OF_WEEK[date.getDay()]
  const dayNumber = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${month}${dayOfWeek}${dayNumber}-${year}`
}

function generateDates() {
  const startDate = new Date(2024, 0, 1) // January 1, 2024
  const endDate = new Date() // Today
  const dates: string[][] = Array(ROWS).fill([]).map(() => [])
  
  let currentDate = new Date(startDate)
  let columnIndex = 0
  
  while (currentDate <= endDate) {
    const rowIndex = columnIndex % ROWS
    dates[rowIndex].push(formatDate(currentDate))
    
    currentDate.setDate(currentDate.getDate() + 1)
    columnIndex++
  }
  
  return dates
}

interface HabitTrackerProps {
  title: string
  onRemove: () => void
  onRename: (newTitle: string) => void // Nueva prop para renombrar el hábito
}

export default function HabitTracker({ title, onRemove, onRename }: HabitTrackerProps) {
  const [markedDays, setMarkedDays] = useState<string[]>([])
  const [isHovered, setIsHovered] = useState(false) // Estado para controlar el hover
  const [isEditing, setIsEditing] = useState(false) // Estado para editar el nombre
  const [currentTitle, setCurrentTitle] = useState(title) // Título editable
  const dates = generateDates()
  const today = formatDate(new Date())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Refs para el sonido
  const confettiSound = useRef<HTMLAudioElement | null>(null)

  const markDay = (date: string, dayElement: HTMLElement) => {
    if (!markedDays.includes(date)) {
      setMarkedDays(prev => [...prev, date])
      triggerConfetti(dayElement)
    } else {
      setMarkedDays(prev => prev.filter(day => day !== date))
    }
  }

  const triggerConfetti = (dayElement: HTMLElement) => {
    const rect = dayElement.getBoundingClientRect()

    // Reproducir sonido con volumen más bajo
    if (confettiSound.current) {
      confettiSound.current.volume = 0.10  // Ajustar volumen al 20%
      confettiSound.current.currentTime = 0
      confettiSound.current.play()
    }

    confetti({
      particleCount: 300,
      startVelocity: 30,
      spread: 360,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
    })
  }

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const handleRename = () => setIsEditing(true)
  const handleBlur = () => {
    setIsEditing(false)
    onRename(currentTitle.trim()) // Llama a la prop para renombrar
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
  }

  return (
    <div 
      className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-4 shadow-lg"
      onMouseEnter={handleMouseEnter} // Evento al entrar el mouse
      onMouseLeave={handleMouseLeave} // Evento al salir el mouse
    >
      {/* Audio para sonido */}
      <audio ref={confettiSound} src="/sounds/cheer-short.mp3" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3">
        {isEditing ? (
          <input
            type="text"
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-xl font-semibold text-white bg-transparent focus:outline-none w-full"
          />
        ) : (
          <h2
            className="text-xl font-semibold text-white cursor-pointer"
            onClick={handleRename}
          >
            {currentTitle}
          </h2>
        )}
        <div className="flex gap-4 group relative">
          {/* Botón de eliminar */}
          {isHovered && (
            <button 
              className="p-3 rounded-full transition-transform transform hover:scale-105 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 absolute left-[-54px] transition-all"
              onClick={onRemove}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Botón de marcar día */}
          <button 
            ref={buttonRef}
            className={`p-3 rounded-full transition-transform transform hover:scale-105 ${
              markedDays.includes(today) ? 'bg-emerald-500' : 'bg-gray-700'
            } hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50`}
            onClick={() => markDay(today, buttonRef.current!)} // Pasa el ref correcto
          >
            <Check className={`w-5 h-5 ${markedDays.includes(today) ? 'text-white' : 'text-emerald-400'}`} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max">
          {dates.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((date) => {
                const [month, , day, year] = date.match(/([A-Z]{2})([A-Z])(\d{2})-(\d{2})/)?.slice(1) || []
                const dateObj = new Date(parseInt(`20${year}`), MONTHS.indexOf(month), parseInt(day))
                if (dateObj > new Date()) return null // Don't render future dates

                return (
                  <div
                    key={date}
                    onClick={(e) => markDay(date, e.currentTarget)} // Pasa el elemento del día
                    className={`
                      w-8 h-8 rounded-md text-[8px] font-medium
                      flex flex-col items-center justify-center
                      transition-colors duration-200 cursor-pointer
                      ${markedDays.includes(date)
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    <span className="text-[9px] font-bold">{month}</span>
                    <span className="text-[10px]">{day}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}