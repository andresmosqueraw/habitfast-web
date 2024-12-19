'use client'

import { useState, useRef, useEffect } from "react"
import { Check, Trash2, Flame, Edit } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface HabitTrackerProps {
  id: number;
  title: string;
  onRemove: () => void;
  onRename: (newTitle: string) => void;
  initialMarkedDays?: string[];
  initialCategoryId?: number | null;
  categories: { id: number; name: string }[];
}

function formatDateForDB(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const dayOfWeek = date.getDay()
  const dayNumber = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear().toString().slice(-2)
  return `${month}${dayOfWeek}${dayNumber}-${year}`
}

function generateDates(months: string[], days: string[]): string[][] { // eslint-disable-line @typescript-eslint/no-unused-vars
  const startDate = new Date(2023, 4, 1)
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

export default function HabitTracker({ id, title, onRemove, onRename, initialMarkedDays = [], initialCategoryId = null, categories }: HabitTrackerProps) {
  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(initialCategoryId);

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
    let newMarkedDays: string[];

    if (!markedDays.includes(date)) {
      newMarkedDays = [...markedDays, date];
      setMarkedDays(newMarkedDays);
      triggerConfetti(dayElement);
    } else {
      newMarkedDays = markedDays.filter(day => day !== date);
      setMarkedDays(newMarkedDays);
    }

    if (user) {
      const { error } = await supabase
        .from('habits')
        .update({ marked_days: newMarkedDays })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating marked days:', error);
        setMarkedDays(markedDays);
      }
    }
  };

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

  const playHoverSound = () => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.volume = 0.2
      hoverSoundRef.current.currentTime = 0;
      hoverSoundRef.current.play();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('habits')
        .update({ title: currentTitle.trim(), category_id: currentCategoryId })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      onRename(currentTitle.trim());
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  return (
    <div 
      className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-4 shadow-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <audio ref={confettiSound} src="/sounds/cheer-short.mp3" />
      <audio ref={hoverSoundRef} src="/sounds/hover-sound-effect.mp3" />

      <div className="flex justify-between items-center pb-3">
        {/* Contenedor del título */}
        <div className="flex-1 min-w-0 mr-6">
          <span className="text-xl font-semibold text-white bg-transparent w-full truncate cursor-pointer">
            {currentTitle}
          </span>
        </div>

        {/* Contenedor de racha y botones */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Racha con texto descriptivo */}
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500 bg-opacity-20 px-3 py-1.5 rounded-md whitespace-nowrap">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-500 hidden sm:inline">
                {streak} days streak
              </span>
              <span className="text-sm font-medium text-orange-500 sm:hidden">
                {streak}
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
            onMouseEnter={playHoverSound}
          >
            <Check className={`w-5 h-5 ${markedDays.includes(today) ? 'text-white' : 'text-emerald-400'}`} />
          </button>

          {/* Botón de editar */}
          <button 
            className="p-3 rounded-full transition-transform transform hover:scale-105 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} ref={scrollContainerRef}>
        <div className="grid grid-rows-7 grid-flow-col gap-1 min-w-max">
          {dates.map((row: string[], rowIndex: number) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((dbDate: string) => {
                const [monthNum, dayOfWeek, dayNum, year] = dbDate.match(/(\d{2})(\d)(\d{2})-(\d{2})/)?.slice(1) || []
                const dateObj = new Date(parseInt(`20${year}`), parseInt(monthNum) - 1, parseInt(dayNum))
                if (dateObj > new Date()) return null

                const tooltipText = `${DAYS_OF_WEEK[parseInt(dayOfWeek)]}, ${dayNum} ${MONTHS[parseInt(monthNum) - 1]} 20${year}`;

                return (
                  <div
                    key={dbDate}
                    onClick={(e) => markDay(dbDate, e.currentTarget)}
                    className={`
                      w-4 h-4 rounded-md
                      transition-colors duration-200 cursor-pointer
                      ${markedDays.includes(dbDate)
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-gray-700 hover:bg-gray-600'
                      }
                    `}
                    title={tooltipText}
                  >
                    {/* Removed text elements */}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Habit</h2>
            <input
              type="text"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter new habit name"
            />
            <select
              value={currentCategoryId || ''}
              onChange={(e) => {
                const selectedId = Number(e.target.value) || null;
                setCurrentCategoryId(selectedId);
                console.log('Selected Category ID:', selectedId);
              }}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-2"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}