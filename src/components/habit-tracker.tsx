'use client'

import { useState, useRef, useEffect } from "react"
import { Check, Trash2, Flame } from 'lucide-react'
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

function formatDateForDB(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const dayOfWeek = date.getDay()
  const dayNumber = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${month}${dayOfWeek}${dayNumber}-${year}`
}

function formatDateForDisplay(dbDate: string, months: string[], days: string[]): string {
  const [monthNum, dayOfWeek, dayNum, year] = dbDate.match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
  const month = months[parseInt(monthNum) - 1]
  const day = days[parseInt(dayOfWeek)]
  return `${month}${day}${dayNum}-${year}`
}

function generateDates(months: string[], days: string[]): string[][] { // eslint-disable-line @typescript-eslint/no-unused-vars
  const startDate = new Date(2024, 0, 1)
  const endDate = new Date()
  const dates: string[][] = Array(7).fill([]).map(() => [])
  const currentDate = new Date(startDate)
  let columnIndex = 0
  
  while (currentDate <= endDate) {
    const rowIndex = columnIndex % 7
    const dbDate = formatDateForDB(currentDate)
    dates[rowIndex].push(dbDate)
    currentDate.setDate(currentDate.getDate() + 1)
    columnIndex++
  }
  
  return dates
}

function calculateStreak(markedDays: string[]): number {
  if (!markedDays.length) return 0
  
  const sortedDays = [...markedDays].sort((a, b) => {
    const [monthA, , dayA, yearA] = a.match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
    const [monthB, , dayB, yearB] = b.match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
    const dateA = new Date(2000 + parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA))
    const dateB = new Date(2000 + parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB))
    return dateB.getTime() - dateA.getTime()
  })

  let streak = 1
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(today.getDate() - 2)
  
  // Obtener la fecha más reciente marcada
  const [monthRecent, , dayRecent, yearRecent] = sortedDays[0].match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
  const mostRecentDate = new Date(2000 + parseInt(yearRecent), parseInt(monthRecent) - 1, parseInt(dayRecent))
  mostRecentDate.setHours(0, 0, 0, 0)
  
  // Si la fecha más reciente es anterior a hace dos días, no hay racha
  if (mostRecentDate < twoDaysAgo) return 0
  
  // Contar días consecutivos hacia atrás
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const [monthCurrent, , dayCurrent, yearCurrent] = sortedDays[i].match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
    const [monthNext, , dayNext, yearNext] = sortedDays[i + 1].match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
    
    const currentDate = new Date(2000 + parseInt(yearCurrent), parseInt(monthCurrent) - 1, parseInt(dayCurrent))
    const nextDate = new Date(2000 + parseInt(yearNext), parseInt(monthNext) - 1, parseInt(dayNext))
    currentDate.setHours(0, 0, 0, 0)
    nextDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

export default function HabitTracker({ id, title, onRemove, onRename, initialMarkedDays = [], language }: HabitTrackerProps) {
  const t = translations[language]
  const DAYS_OF_WEEK = t.days
  const MONTHS = t.months
  const ROWS = 7 // eslint-disable-line @typescript-eslint/no-unused-vars

  const [markedDays, setMarkedDays] = useState<string[]>(initialMarkedDays)
  const [user, setUser] = useState<User | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [currentTitle, setCurrentTitle] = useState(title)
  const dates = generateDates(MONTHS, DAYS_OF_WEEK)
  const today = formatDateForDB(new Date())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const confettiSound = useRef<HTMLAudioElement | null>(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setStreak(calculateStreak(markedDays))
  }, [markedDays])

  const markDay = async (date: string, dayElement: HTMLElement) => {
    let newMarkedDays: string[]
    if (!markedDays.includes(date)) {
      newMarkedDays = [...markedDays, date]
      triggerConfetti(dayElement)
    } else {
      newMarkedDays = markedDays.filter(day => day !== date)
    }

    if (user) {
      const { error } = await supabase
        .from('habits')
        .update({ marked_days: newMarkedDays })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating marked days:', error)
        return
      }
    }

    setMarkedDays(newMarkedDays)
  }

  const triggerConfetti = (dayElement: HTMLElement) => {
    const rect = dayElement.getBoundingClientRect()

    if (confettiSound.current) {
      confettiSound.current.volume = 0.05
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
  const handleBlur = () => {
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
        {/* Contenedor del título */}
        <div className="flex items-center gap-3 flex-grow min-w-0 mr-4">
          <input
            type="text"
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              const input = e.target as HTMLInputElement;
              const clickPosition = e.clientX - input.getBoundingClientRect().left;
              if (clickPosition < 10) {
                input.setSelectionRange(0, 0);
              } else {
                input.setSelectionRange(
                  input.selectionStart,
                  input.selectionStart
                );
              }
            }}
            className="text-xl font-semibold text-white bg-transparent focus:outline-none flex-grow break-words cursor-pointer"
            style={{ lineHeight: '1.5', padding: '4px 0' }}
          />
        </div>

        {/* Contenedor de racha y botones */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Racha con texto descriptivo */}
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500 bg-opacity-20 px-3 py-1.5 rounded-md">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">
                {streak} {t.streakDays}
              </span>
            </div>
          )}

          {/* Botón de eliminar - Ahora solo visible en hover */}
          {isHovered && (
            <button 
              className="p-3 rounded-full transition-transform transform hover:scale-105 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
              onClick={onRemove}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Botón de marcar hábito */}
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
              {row.map((dbDate: string) => {
                const displayDate = formatDateForDisplay(dbDate, MONTHS, DAYS_OF_WEEK) // eslint-disable-line @typescript-eslint/no-unused-vars
                const [monthNum, dayOfWeek, dayNum, year] = dbDate.match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || [] // eslint-disable-line @typescript-eslint/no-unused-vars
                const dateObj = new Date(parseInt(`20${year}`), parseInt(monthNum) - 1, parseInt(dayNum))
                if (dateObj > new Date()) return null

                return (
                  <div
                    key={dbDate}
                    onClick={(e) => markDay(dbDate, e.currentTarget)}
                    className={`
                      w-8 h-8 rounded-md text-[8px] font-medium
                      flex flex-col items-center justify-center
                      transition-colors duration-200 cursor-pointer
                      ${markedDays.includes(dbDate)
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    <span className="text-[9px] font-bold">{MONTHS[parseInt(monthNum) - 1]}</span>
                    <span className="text-[10px]">{dayNum}</span>
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