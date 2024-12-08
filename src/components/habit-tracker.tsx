'use client'

import { useState, useRef, useEffect } from "react"
import { Check, Trash2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import { translations } from '../lib/translations'

interface HabitTrackerProps {
  id: number;
  title: string;
  onRemove: () => void;
  onRename: (newTitle: string) => void;
  initialMarkedDays?: string[];
  language: 'en' | 'es';
}

function formatDate(date: Date, months: string[], days: string[]): string {
  const month = months[date.getMonth()]
  const dayOfWeek = days[date.getDay()]
  const dayNumber = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${month}${dayOfWeek}${dayNumber}-${year}`
}

function generateDates(months: string[], days: string[]): string[][] {
  const startDate = new Date(2024, 0, 1) // January 1, 2024
  const endDate = new Date() // Today
  const dates: string[][] = Array(7).fill([]).map(() => [])
  
  let currentDate = new Date(startDate)
  let columnIndex = 0
  
  while (currentDate <= endDate) {
    const rowIndex = columnIndex % 7
    dates[rowIndex].push(formatDate(currentDate, months, days))
    
    currentDate.setDate(currentDate.getDate() + 1)
    columnIndex++
  }
  
  return dates
}

export default function HabitTracker({ id, title, onRemove, onRename, initialMarkedDays = [], language }: HabitTrackerProps) {
  const t = translations[language]
  const DAYS_OF_WEEK = t.days
  const MONTHS = t.months
  const ROWS = 7

  const [markedDays, setMarkedDays] = useState<string[]>(initialMarkedDays)
  const [user, setUser] = useState<User | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(title)
  const dates = generateDates(MONTHS, DAYS_OF_WEEK)
  const today = formatDate(new Date(), MONTHS, DAYS_OF_WEEK)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const confettiSound = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const markDay = async (date: string, dayElement: HTMLElement) => {
    if (!user) return

    let newMarkedDays: string[]
    if (!markedDays.includes(date)) {
      newMarkedDays = [...markedDays, date]
      triggerConfetti(dayElement)
    } else {
      newMarkedDays = markedDays.filter(day => day !== date)
    }

    const { error } = await supabase
      .from('habits')
      .update({ marked_days: newMarkedDays })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating marked days:', error)
      return
    }

    setMarkedDays(newMarkedDays)
  }

  const triggerConfetti = (dayElement: HTMLElement) => {
    const rect = dayElement.getBoundingClientRect()

    if (confettiSound.current) {
      confettiSound.current.volume = 0.10
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
    onRename(currentTitle.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur()
    }
  }

  return (
    <div 
      className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-4 shadow-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <audio ref={confettiSound} src="/sounds/cheer-short.mp3" />

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
          {isHovered && (
            <button 
              className="p-3 rounded-full transition-transform transform hover:scale-105 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 absolute left-[-54px] transition-all"
              onClick={onRemove}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}

          <button 
            ref={buttonRef}
            className={`p-3 rounded-full transition-transform transform hover:scale-105 ${
              markedDays.includes(today) ? 'bg-emerald-500' : 'bg-gray-700'
            } hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50`}
            onClick={() => markDay(today, buttonRef.current!)}
          >
            <Check className={`w-5 h-5 ${markedDays.includes(today) ? 'text-white' : 'text-emerald-400'}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max">
          {dates.map((row: string[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((date: string) => {
                const [month, , day, year] = date.match(/([A-Z]{2})([A-Z])(\d{2})-(\d{2})/)?.slice(1) || []
                const dateObj = new Date(parseInt(`20${year}`), MONTHS.indexOf(month), parseInt(day))
                if (dateObj > new Date()) return null

                return (
                  <div
                    key={date}
                    onClick={(e) => markDay(date, e.currentTarget)}
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