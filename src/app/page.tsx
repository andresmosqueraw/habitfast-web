'use client'

import HabitTracker from '../components/habit-tracker'
import { Button } from "../components/ui/button"
import { Plus, X } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import Image from 'next/image';

interface Habit {
  id: number;
  title: string;
  marked_days?: string[];
  category_id?: number | null;
}

export default function Page() {
  const defaultHabits = useMemo(() => [
    { id: 1, title: "exercise", marked_days: [] },
    { id: 2, title: "read", marked_days: [] }
  ], []);

  const [habits, setHabits] = useState<Habit[]>(defaultHabits)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null)
  const [newHabitTitle, setNewHabitTitle] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const [errorLog, setErrorLog] = useState<string | null>(null)
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [lastDeletedCategory, setLastDeletedCategory] = useState<{ id: number; name: string } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(-1);

  const isNotificationAvailable = () => {
    return typeof window !== 'undefined' && 
           'Notification' in window &&
           typeof Notification !== 'undefined';
  };

  const loadHabits = async (userId: string, categoryId: number | null = -1) => {
    try {
      let query = supabase
        .from('habits')
        .select('*, categories(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (categoryId !== -1) {
        query = categoryId === null ? query.is('category_id', null) : query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHabits(data || []);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading habits:', error);
        setErrorLog(`Error loading habits: ${error.message}`);
      } else {
        console.error('Error loading habits:', error);
        setErrorLog('Error loading habits: An unknown error occurred.');
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        loadHabits(currentUser.id);
      } else {
        setHabits(defaultHabits);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        loadHabits(currentUser.id);
      } else {
        setHabits(defaultHabits);
      }
    });

    return () => subscription.unsubscribe();
  }, [defaultHabits]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage) {
        // setLanguage(savedLanguage)
      }

      if (isNotificationAvailable()) {
        if (Notification.permission === 'default') {
          setShowNotificationPrompt(true);
        } else if (Notification.permission === 'granted') {
          scheduleNotifications();
        }
      }
    }
  }, []);

  const requestNotificationPermission = () => {
    if (!isNotificationAvailable()) return;

    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        scheduleNotifications();
      }
      setShowNotificationPrompt(false);
    });
  };

  const scheduleNotifications = () => {
    if (!isNotificationAvailable()) return;

    const now = new Date();
    const times = [
      { hour: 11, minute: 0 },
      { hour: 20, minute: 0 }
    ];

    times.forEach(({ hour, minute }) => {
      const notificationTime = new Date();
      notificationTime.setHours(hour, minute, 0, 0);

      if (notificationTime < now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      const timeout = notificationTime.getTime() - now.getTime();
      setTimeout(() => {
        if (isNotificationAvailable()) {
          new Notification("Don't forget to mark your habits!");
        }
      }, timeout);
    });
  };

  const removeHabit = async (habitId: number) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', habitId)
        .eq('user_id', user.id)

      if (error) throw error;

      setHabits(habits.filter(habit => habit.id !== habitId))
    } catch (error) {
      const err = error as Error;
      console.error('Error removing habit:', err);
      setErrorLog(`Error removing habit: ${err.message}`);
    }
  }

  const renameHabit = async (habitId: number, newTitle: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('habits')
        .update({ title: newTitle })
        .eq('id', habitId)
        .eq('user_id', user.id)

      if (error) throw error;

      setHabits((prevHabits) =>
        prevHabits.map((habit) =>
          habit.id === habitId ? { ...habit, title: newTitle } : habit
        )
      )
    } catch (error) {
      const err = error as Error;
      console.error('Error renaming habit:', err);
      setErrorLog(`Error renaming habit: ${err.message}`);
    }
  }

  const addHabit = async () => {
    if (!newHabitTitle.trim()) return;
  
    // Validar si `selectedCategoryId` existe en las categorías
    const categoryExists = categories.some(category => category.id === selectedCategoryId);
  
    if (selectedCategoryId && !categoryExists) {
      setErrorLog("The selected category does not exist.");
      return;
    }
  
    const newHabit = {
      id: Date.now(),
      title: newHabitTitle,
      user_id: user?.id || null,
      category_id: selectedCategoryId || null,
      marked_days: []
    };
  
    try {
      if (user) {
        const { error } = await supabase.from('habits').insert(newHabit);
  
        if (error) throw error;
      }
  
      setHabits(prevHabits => [...prevHabits, newHabit]);
      setNewHabitTitle("");
      setIsModalOpen(false);
    } catch (error) {
      const err = error as Error;
      console.error('Error adding habit:', err);
      setErrorLog(`Error adding habit: ${err.message}`);
    }
  };  

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
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log('Redirecting to:', isDevelopment ? 'localhost' : 'production URL');
    
    const redirectURL = isDevelopment
        ? 'http://localhost:3000/auth/callback'
        : process.env.NEXT_PUBLIC_VERCEL_URL 
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`;

    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectURL
        }
    });
  }

  const playHoverSound = () => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.volume = 0.2
      hoverSoundRef.current.currentTime = 0;
      hoverSoundRef.current.play();
    }
  }

  const openCategoryModal = () => setIsCategoryModalOpen(true);
  const closeCategoryModal = () => setIsCategoryModalOpen(false);

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
  
    try {
      if (user) {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: newCategoryName.trim(), user_id: user.id })
          .select(); // Devuelve la categoría recién creada
  
        if (error) throw error;
  
        // Usa la categoría devuelta para establecer el ID
        if (data) {
          setCategories([...categories, ...data]);
        }
      }
  
      setNewCategoryName("");
      closeCategoryModal();
    } catch (error) {
      const err = error as Error;
      console.error('Error adding category:', err);
      setErrorLog(`Error adding category: ${err.message}`);
    }
  };  

  const toggleCategorySelection = (category: { id: number; name: string }, categoryId: number) => {
    const newSelectedCategoryId = selectedCategoryId === categoryId ? null : categoryId;
    setSelectedCategoryId(newSelectedCategoryId);
  };

  const confirmDeleteCategory = (category: { id: number; name: string }) => {
    setCategoryToDelete(category.name);
  };

  const deleteCategory = async () => {
    if (categoryToDelete) {
      try {
        if (user) {
          // Desvincular hábitos de la categoría
          const categoryId = categories.find(cat => cat.name === categoryToDelete)?.id;
          if (categoryId) {
            const { error: habitError } = await supabase
              .from('habits')
              .update({ category_id: null })
              .eq('category_id', categoryId)
              .eq('user_id', user.id);

            if (habitError) throw habitError;
          }

          // Eliminar la categoría
          const { error } = await supabase
            .from('categories')
            .delete()
            .eq('name', categoryToDelete)
            .eq('user_id', user.id);

          if (error) throw error;

          setCategories(categories.filter(category => category.name !== categoryToDelete));
          if (selectedCategory?.name === categoryToDelete) {
            setSelectedCategory(null);
          }
          setLastDeletedCategory(categories.find(category => category.name === categoryToDelete) || null);
          setShowUndo(true);
          setCategoryToDelete(null);

          setTimeout(() => {
            setShowUndo(false);
          }, 3000);
        }
      } catch (error) {
        const err = error as Error;
        console.error('Error deleting category:', err);
        setErrorLog(`Error deleting category: ${err.message}`);
      }
    }
  };

  const undoDelete = () => {
    if (lastDeletedCategory) {
      setCategories([...categories, lastDeletedCategory]);
      setShowUndo(false);
      setLastDeletedCategory(null);
    }
  };

  useEffect(() => {
    const loadCategories = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setCategories(data.map((category) => ({ id: category.id, name: category.name })) || []);
      } catch (error) {
        const err = error as Error;
        console.error('Error loading categories:', err);
        setErrorLog(`Error loading categories: ${err.message}`);
      }
    };

    if (user) {
      loadCategories(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHabits(user.id, selectedCategoryId);
    }
  }, [user, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-1">
      <nav className="bg-gray-800 bg-opacity-50 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Image src="/images/logo-b-blue.svg" alt="Logo" className="h-12 w-12" width={48} height={48} />
          <h1 className="text-2xl font-bold text-white">HabitFast</h1>
        </div>
        <div className="flex items-center space-x-4">
          {!user && (
            <button
              className="text-white text-lg font-medium bg-gray-800 bg-opacity-50 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              onClick={handleLogin}
            >
              Sign in
            </button>
          )}
          <Button 
            className="bg-gray-800 bg-opacity-50 rounded-lg p-2 text-white hover:bg-gray-700 transition-colors"
            onClick={openModal}
            onMouseEnter={playHoverSound}
          >
            <Plus className="mr-2 h-5 w-5" /> Create Habit
          </Button>
          <Button 
            className="bg-gray-800 bg-opacity-50 rounded-lg p-2 text-white hover:bg-gray-700 transition-colors"
            onClick={openCategoryModal}
            onMouseEnter={playHoverSound}
          >
            <Plus className="mr-2 h-5 w-5" /> Agregar Categoría
          </Button>
        </div>
      </nav>

      <div className="flex justify-center mt-4">
        <div className="ml-4 flex flex-wrap gap-2">
          <div className="flex items-center">
            <span
              onClick={() => setSelectedCategoryId(-1)}
              className={`cursor-pointer px-3 py-1 rounded-full flex items-center justify-center ${
                selectedCategoryId === -1
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              All
            </span>
          </div>
          <div className="flex items-center">
            <span
              onClick={() => setSelectedCategoryId(null)}
              className={`cursor-pointer px-3 py-1 rounded-full flex items-center justify-center ${
                selectedCategoryId === null
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-700 text-white"
              }`}
            >
              No Category
            </span>
          </div>
          {categories.map((category, index) => (
            <div key={index} className="flex items-center">
              <span
                onClick={() => toggleCategorySelection(category, category.id)}
                className={`cursor-pointer px-3 py-1 rounded-full flex items-center justify-center ${
                  selectedCategoryId === category.id
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                {category.name}
              </span>
              <button
                onClick={() => confirmDeleteCategory(category)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-gray-300 mt-4">
        <p>We are what we repeatedly do. Excellence, then is not an act but a habit. ~Aristotle</p>
      </div>

      <div className="max-w-6xl mx-auto space-y-2 mt-4">
        {/* Habit Trackers */}
        {habits.map(habit => (
          <HabitTracker
            key={habit.id}
            id={habit.id}
            title={habit.title}
            initialMarkedDays={habit.marked_days || []}
            initialCategoryId={habit.category_id || null}
            categories={categories}
            onRemove={() => openDeleteModal(habit.id)}
            onRename={(newTitle) => renameHabit(habit.id, newTitle)}
          />
        ))}

        {/* Additional Information */}
        <div className="text-center space-y-2 text-gray-400">
          <p>
            Made with ☕ and ❤️ by <a href="https://linktr.ee/andrewmos" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Andres Mosquera</a>
          </p>
          <p>
            <a href="https://github.com/andresmosqueraw/habitfast-web" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">HabitFast is Open Source</a>
          </p>
        </div>

        {/* Error Log Display */}
        {errorLog && (
          <div className="bg-red-500 text-white p-4 rounded-md mt-4">
            {errorLog}
          </div>
        )}

        {/* Audio element for hover sound */}
        <audio ref={hoverSoundRef} src="/sounds/hover-sound-effect.mp3" />
      </div>

      {/* Notification Prompt */}
      {showNotificationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Enable Notifications</h2>
            <p className="text-gray-300 mb-4">Stay on track with your habits by enabling notifications.</p>
            <button
              onClick={requestNotificationPermission}
              className="w-full px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}

      {/* Modal for New Habit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">New Habit</h2>
            <input
              type="text"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter habit name"
            />
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => {
                const selectedId = Number(e.target.value) || null;
                setSelectedCategoryId(selectedId);
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
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addHabit}
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Habit Deletion */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Are you sure?</h2>
            <p className="text-gray-300">You are about to delete this habit. Do you want to continue?</p>
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteHabit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Notification */}
      {showUndo && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-md shadow-lg">
          <span>Category deleted.</span>
          <button
            onClick={undoDelete}
            className="ml-2 text-emerald-500 hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {/* Confirmation Modal for Category Deletion */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Are you sure?</h2>
            <p className="text-gray-300">You are about to delete this category. Do you want to continue?</p>
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteCategory}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-80 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">New Category</h2>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Enter category name"
            />
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={closeCategoryModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCategory}
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-400 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}