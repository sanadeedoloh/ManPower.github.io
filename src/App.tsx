/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parse, 
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Database, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Video, 
  FileText,
  Menu,
  X,
  Plus,
  Check,
  Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { ScheduleEvent, CSVRow } from './types';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch, 
  doc,
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';

// Initial data empty
const INITIAL_CSV = `Asset,Live Date,Live Time,End Time,KOL name,Studio,Tech 1,Tech 2,Tech 3,Leave = ไม่แยู่,Note`;

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'database'>('calendar');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGridEditMode, setIsGridEditMode] = useState(false);
  const [daySummaryDate, setDaySummaryDate] = useState<Date | null>(null);
  const [gridEvents, setGridEvents] = useState<ScheduleEvent[]>([]);
  const [formData, setFormData] = useState<Partial<ScheduleEvent>>({});
  const [selectedTech, setSelectedTech] = useState<string>('All');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (uploadStatus) {
      const timer = setTimeout(() => setUploadStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  // Firestore real-time listener
  useEffect(() => {
    const q = query(collection(db, 'schedules'), orderBy('parsedDate', 'asc'), orderBy('liveTime', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedEvents = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            parsedDate: new Date(data.parsedDate) // Convert ISO string back to Date
          } as ScheduleEvent;
        });
        setEvents(fetchedEvents);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'schedules');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const startGridEdit = () => {
    setGridEvents([...events]);
    setIsGridEditMode(true);
  };

  const cancelGridEdit = () => {
    setIsGridEditMode(false);
    setGridEvents([]);
  };

  const handleGridChange = (index: number, field: keyof ScheduleEvent, value: any) => {
    const updated = [...gridEvents];
    updated[index] = { ...updated[index], [field]: value };
    
    // If date changes, update liveDate string
    if (field === 'parsedDate' && value instanceof Date) {
      updated[index].liveDate = format(value, 'EEE-d-MMM');
    }
    
    setGridEvents(updated);
  };

  const addGridRow = () => {
    const newRow: ScheduleEvent = {
      id: `new-${Date.now()}`,
      asset: 'SLD',
      liveDate: format(new Date(), 'EEE-d-MMM'),
      parsedDate: new Date(),
      liveTime: '12:00',
      endTime: '14:00',
      kolName: '',
      studio: 'Studio 1',
      tech1: '',
      tech2: '',
      tech3: '',
      note: '',
      leaveStatus: ''
    };
    setGridEvents([newRow, ...gridEvents]);
  };

  const saveGridChanges = async () => {
    if (!user) return alert("Please login to save changes");
    
    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      
      for (const event of gridEvents) {
        const docRef = event.id.startsWith('new-') 
          ? doc(collection(db, 'schedules'))
          : doc(db, 'schedules', event.id);
          
        const data = { ...event };
        delete (data as any).id;
        
        // Ensure date is stored as ISO string or Timestamp
        if (data.parsedDate instanceof Date) {
            data.parsedDate = data.parsedDate.toISOString() as any;
        }

        batch.set(docRef, data);
      }
      
      await batch.commit();
      setUploadStatus({ type: 'success', message: 'All changes saved successfully' });
      setIsGridEditMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = (day: Date) => {
    if (!user) return alert("Please login to add events");
    setFormData({
      asset: 'SLD',
      liveDate: format(day, 'EEE-d-MMM'),
      parsedDate: day,
      liveTime: '12:00',
      endTime: '14:00',
      kolName: '',
      studio: 'Studio 1',
      tech1: '',
      tech2: '',
      tech3: '',
      note: '',
      leaveStatus: ''
    });
    setIsAdding(true);
    setSelectedEvent({} as ScheduleEvent); // Trigger modal
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    setFormData({ ...selectedEvent });
    setIsEditing(true);
  };

  const handleSaveEvent = async () => {
    if (!user) return alert("Please login to save changes");
    if (!formData.kolName || !formData.asset) return alert("KOL Name and Asset are required");

    try {
      setIsLoading(true);
      const scheduleRef = formData.id 
        ? doc(db, 'schedules', formData.id) 
        : doc(collection(db, 'schedules'));

      const dataToSave = {
        ...formData,
        parsedDate: formData.parsedDate instanceof Date 
          ? formData.parsedDate.toISOString() 
          : formData.parsedDate
      };
      
      // Remove id from data if it exists (since it's the document identifier)
      delete (dataToSave as any).id;

      await setDoc(scheduleRef, dataToSave);
      
      setUploadStatus({ 
        type: 'success', 
        message: formData.id ? 'Event updated successfully!' : 'Event added successfully!' 
      });
      setSelectedEvent(null);
      setIsEditing(false);
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!user) return alert("Please login to delete events");
    
    // If not already in confirming state, show the confirmation UI
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    try {
      setIsLoading(true);
      await deleteDoc(doc(db, 'schedules', id));
      setUploadStatus({ type: 'success', message: 'Event deleted successfully' });
      setSelectedEvent(null);
      setIsEditing(false);
      setIsAdding(false);
      setIsDeleting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToFirestore = async (newEvents: Omit<ScheduleEvent, 'id'>[]) => {
    if (!user) return alert("Please login to update database");
    
    try {
      setIsLoading(true);
      // 1. Delete all existing events first (for complete replacement logic as requested)
      const batchSize = 500;
      const snapshot = await getDocs(collection(db, 'schedules'));
      
      let batch = writeBatch(db);
      let count = 0;
      
      for (const d of snapshot.docs) {
        batch.delete(d.ref);
        count++;
        if (count >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      // 2. Add new events
      batch = writeBatch(db);
      count = 0;
      for (const event of newEvents) {
        const eventRef = doc(collection(db, 'schedules'));
        batch.set(eventRef, {
          ...event,
          parsedDate: event.parsedDate.toISOString() // Store as ISO string
        });
        count++;
        if (count >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      
      setUploadStatus({ type: 'success', message: 'Database updated and synced successfully!' });
    } catch (error: any) {
      const errorMessage = error?.message?.includes('permission-denied') 
        ? 'Permission Denied: Please check if you are an authorized user.' 
        : 'Update failed. Check CSV format or connection.';
      setUploadStatus({ type: 'error', message: errorMessage });
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique tech names

  // Extract unique tech names
  const uniqueTechs = useMemo(() => {
    const techs = new Set<string>();
    events.forEach(event => {
      if (event.tech1) techs.add(event.tech1.trim());
      if (event.tech2) techs.add(event.tech2.trim());
      if (event.tech3) techs.add(event.tech3.trim());
    });
    return Array.from(techs).filter(Boolean).sort();
  }, [events]);

  // Parse CSV function
  const parseCSV = (csvString: string, shouldSave = false) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedEvents: Omit<ScheduleEvent, 'id'>[] = results.data.map((row: any) => {
          const dateStr = row['Live Date'] || '';
          const parts = dateStr.split('-');
          let parsedDate = new Date();
          
          if (parts.length === 3) {
            const day = parseInt(parts[1]);
            const monthStr = parts[2];
            parsedDate = parse(`${day} ${monthStr} 2026`, 'd MMM yyyy', new Date());
          }

          return {
            asset: row['Asset'] || '',
            liveDate: dateStr,
            parsedDate,
            liveTime: row['Live Time'] || '',
            endTime: row['End Time'] || '',
            kolName: row['KOL name'] || '',
            studio: row['Studio'] || '',
            tech1: row['Tech 1'] || '',
            tech2: row['Tech 2'] || '',
            tech3: row['Tech 3'] || '',
            leaveStatus: row['Leave = ไม่แยู่'] || '',
            note: row['Note'] || '',
          };
        });

        if (shouldSave) {
          saveToFirestore(parsedEvents);
        } else {
          // If just parsing (like initial load if no DB), we don't set because onSnapshot will handle it if we push to DB
          // For initial user-land feel, we can still set locally if DB is empty
          if (events.length === 0) {
             const withIds = parsedEvents.map((e, idx) => ({ ...e, id: `local-${idx}` }));
             setEvents(withIds as ScheduleEvent[]);
          }
        }
      },
    });
  };

  // Initial load logic moved to Firestore listener
  useEffect(() => {
    // If after some time No events are loaded, maybe offer to upload initial
  }, []);

  // Calendar logic
  // Asset color mapping
  const getAssetStyle = (asset: string) => {
    const assetType = asset.split(' ')[0].toUpperCase();
    switch (assetType) {
      case 'SLD': return 'border-blue-500 bg-blue-50 text-blue-900';
      case 'D-DAY': return 'border-rose-500 bg-rose-50 text-rose-900';
      case 'PAYDAY': return 'border-emerald-500 bg-emerald-50 text-emerald-900';
      case 'MID-MONTH': return 'border-purple-500 bg-purple-50 text-purple-900';
      case 'SBD': return 'border-amber-500 bg-amber-50 text-amber-900';
      case 'BARTER': return 'border-slate-500 bg-slate-50 text-slate-900';
      case 'MC': return 'border-indigo-500 bg-indigo-50 text-indigo-900';
      default: return 'border-indigo-400 bg-slate-50 text-slate-800';
    }
  };

  const assetTypes = useMemo(() => {
    const assets = new Set<string>();
    events.forEach(e => {
        const type = e.asset.split(' ')[0].toUpperCase();
        if (type) assets.add(type);
    });
    return Array.from(assets).sort();
  }, [events]);

  const calendarDays = useMemo(() => {
    if (viewMode === 'monthly') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else if (viewMode === 'weekly') {
      const startDate = startOfWeek(currentDate);
      const endDate = endOfWeek(currentDate);
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      // Daily
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  const prevPeriod = () => {
    if (viewMode === 'monthly') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'weekly') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const nextPeriod = () => {
    if (viewMode === 'monthly') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'weekly') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const eventsForDay = (day: Date) => {
    return events.filter(event => {
      const isDayMatch = isSameDay(event.parsedDate, day);
      if (!isDayMatch) return false;
      if (selectedTech === 'All') return true;
      return (
        event.tech1?.trim() === selectedTech ||
        event.tech2?.trim() === selectedTech ||
        event.tech3?.trim() === selectedTech
      );
    }).sort((a, b) => (a.liveTime || '').localeCompare(b.liveTime || ''));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!user) {
        alert("Please login first to upload and save to database.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text, true);
        setActiveTab('calendar');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <CalendarIcon className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Live Schedule</h1>
          </div>
          
          <nav className="flex bg-slate-100 p-1 rounded-full items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-full mr-2 hidden sm:flex">
              <button
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'calendar' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'database' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Database className="w-4 h-4" />
                <span>Database</span>
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Logged in as</span>
                  <span className="text-xs font-semibold text-slate-700">{user.displayName || user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-slate-800 text-white p-2 rounded-full hover:bg-slate-900 transition-colors"
                  title="Logout"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Asset Legend */}
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-x-4 gap-y-2 items-center flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Asset Types:</span>
                  {assetTypes.map(type => {
                      const style = getAssetStyle(type);
                      return (
                          <div key={type} className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded-sm border-l-2", style.split(' ')[0], style.split(' ')[1])}></div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase">{type}</span>
                          </div>
                      );
                  })}
                  {assetTypes.length === 0 && (
                    <span className="text-[10px] text-slate-400 italic font-medium">No data uploaded yet</span>
                  )}
                </div>
                
                {events.length === 0 && user && (
                  <button 
                    onClick={() => parseCSV(INITIAL_CSV, true)}
                    className="bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Populate Initial Database
                  </button>
                )}
              </div>

              {/* Calendar Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 min-w-[140px]">
                      {viewMode === 'monthly' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'weekly' && (
                        <span className="text-sm">
                          {format(startOfWeek(currentDate), 'd MMM')} - {format(endOfWeek(currentDate), 'd MMM yyyy')}
                        </span>
                      )}
                      {viewMode === 'daily' && format(currentDate, 'EEEE, d MMMM yyyy')}
                    </h2>
                    <div className="flex gap-1">
                      <button onClick={prevPeriod} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <button onClick={nextPeriod} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setViewMode('daily')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        viewMode === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Day
                    </button>
                    <button 
                      onClick={() => setViewMode('weekly')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        viewMode === 'weekly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Week
                    </button>
                    <button 
                      onClick={() => setViewMode('monthly')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        viewMode === 'monthly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      Month
                    </button>
                  </div>

                  <button 
                    onClick={() => setCurrentDate(new Date())} 
                    className="px-4 py-1.5 text-xs font-bold bg-white text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-200"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="tech-filter" className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Filter Tech:</label>
                  <select 
                    id="tech-filter"
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="flex-1 lg:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="All">All Technicians</option>
                    {uniqueTechs.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Calendar Map (Combined Views) */}
              <div className={cn(
                "grid gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-md",
                viewMode === 'daily' ? "grid-cols-1" : "grid-cols-7"
              )}>
                {(viewMode === 'monthly' || viewMode === 'weekly') && ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-slate-100 py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, idx) => {
                  const dayEvents = eventsForDay(day);
                  const isCurrentMonth = format(day, 'MM') === format(currentDate, 'MM');
                  const isDayToday = isToday(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => setDaySummaryDate(day)}
                      className={cn(
                        "bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50 cursor-pointer",
                        viewMode === 'monthly' ? "min-h-[100px] md:min-h-[140px]" : "min-h-[300px] md:min-h-[400px]",
                        viewMode === 'monthly' && !isCurrentMonth && "bg-slate-50 opacity-40"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                           <span className={cn(
                             "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                             isDayToday ? "bg-indigo-600 text-white" : "text-slate-600"
                           )}>
                             {format(day, 'd')}
                           </span>
                           {viewMode === 'daily' && <span className="text-xs font-bold text-slate-400 mt-1">{format(day, 'EEEE')}</span>}
                        </div>
                        <div className="flex gap-1">
                          {user && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAddEvent(day); }}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center border border-slate-200 shadow-sm"
                              title="Add Event"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                          {dayEvents.length > 0 && (
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-bold h-8 flex items-center border border-indigo-100">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={cn(
                        "flex flex-col gap-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200",
                        viewMode === 'monthly' ? "max-h-[85px] md:max-h-[110px]" : "flex-1"
                      )}>
                        {dayEvents.map(event => (
                          <button
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className={cn(
                              "text-left border-l-2 p-1.5 rounded-lg transition-all active:scale-95 flex flex-col gap-0.5 shadow-sm shrink-0",
                              viewMode === 'monthly' ? "text-[7px] md:text-xs" : "text-xs p-2.5",
                              getAssetStyle(event.asset),
                              selectedTech !== 'All' && (event.tech1?.trim() === selectedTech || event.tech2?.trim() === selectedTech || event.tech3?.trim() === selectedTech) ? "ring-2 ring-offset-2 ring-indigo-500 scale-[1.01] z-10" : ""
                            )}
                          >
                            <div className={cn(
                                "flex justify-between items-center opacity-80 font-bold",
                                viewMode === 'monthly' ? "text-[7px] md:text-[10px]" : "text-[11px] mb-1"
                            )}>
                              <div className="flex items-center gap-1">
                                <Clock size={viewMode === 'monthly' ? 8 : 12} />
                                <span>{event.liveTime}</span>
                              </div>
                              <span className="opacity-60 bg-black/5 px-1.5 rounded">{event.studio.replace('Studio ', 'S')}</span>
                            </div>
                            <div className={cn("truncate font-bold text-slate-900", viewMode === 'monthly' ? "hidden md:block" : "text-sm mb-1")}>
                                {event.kolName}
                            </div>
                            <div className={cn(
                                "opacity-70 font-medium flex gap-1 items-center truncate border-t border-black/5 pt-1",
                                viewMode === 'monthly' ? "text-[7px] md:text-[9px]" : "text-[11px]"
                            )}>
                              <User size={viewMode === 'monthly' ? 7 : 11} className="shrink-0" />
                              <span className="truncate">
                                {[event.tech1, event.tech2, event.tech3].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </button>
                        ))}
                        {dayEvents.length === 0 && viewMode !== 'monthly' && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 border-2 border-dashed border-slate-100 rounded-2xl m-2">
                                <CalendarIcon size={32} className="mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">No Events</p>
                            </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Daily List View (Better for mobile) */}
              <div className="md:hidden space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">Upcoming Events</h3>
                <div className="space-y-3">
                  {events
                    .filter(e => {
                      const mStart = startOfMonth(currentDate);
                      const mEnd = endOfMonth(mStart);
                      return e.parsedDate >= mStart && e.parsedDate <= mEnd;
                    })
                    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
                    .slice(0, 5)
                    .map(event => (
                      <div 
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 active:scale-98 transition-transform"
                      >
                        <div className="flex flex-col items-center justify-center bg-indigo-50 w-12 h-12 rounded-lg text-indigo-600">
                          <span className="text-[10px] font-bold uppercase">{format(event.parsedDate, 'MMM')}</span>
                          <span className="text-lg font-bold leading-tight">{format(event.parsedDate, 'd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{event.kolName}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12}/> {event.liveTime}-{event.endTime}</span>
                            <span className="flex items-center gap-1"><Video size={12}/> {event.studio}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="database"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-6xl mx-auto space-y-8 py-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Database Management</h2>
                <p className="text-slate-500">Upload your event schedule CSV to update the calendar or review raw data.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  {user && !isGridEditMode && (
                    <button 
                      onClick={() => handleAddEvent(new Date())}
                      className="w-full bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 text-indigo-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Create New Entry</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Manual Add</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  )}

                  {user && (
                    <button 
                      onClick={isGridEditMode ? saveGridChanges : startGridEdit}
                      className={cn(
                        "w-full p-6 rounded-2xl shadow-sm border flex items-center justify-between transition-all group",
                        isGridEditMode 
                          ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700" 
                          : "bg-white text-slate-900 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                          isGridEditMode ? "bg-emerald-500 text-white" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {isGridEditMode ? <Check size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">{isGridEditMode ? 'Save All Changes' : 'Excel Grid Mode'}</p>
                          <p className={cn(
                            "text-[10px] font-medium uppercase tracking-wider",
                            isGridEditMode ? "text-emerald-100" : "text-slate-400"
                          )}>
                            {isGridEditMode ? 'Commit to Firebase' : 'Bulk Edit Table'}
                          </p>
                        </div>
                      </div>
                      <Box className={cn("w-4 h-4", isGridEditMode ? "text-emerald-300" : "text-slate-300")} />
                    </button>
                  )}

                  {isGridEditMode && (
                     <div className="flex gap-2">
                        <button 
                          onClick={addGridRow}
                          className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-xs border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Add Empty Row
                        </button>
                        <button 
                          onClick={cancelGridEdit}
                          className="flex-1 bg-white text-slate-500 py-3 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                     </div>
                  )}

                  {!isGridEditMode && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    {user ? (
                      <>
                        <div>
                          <p className="font-semibold text-sm">Upload New CSV</p>
                          <p className="text-xs text-slate-400">This will OVERWRITE the current database</p>
                        </div>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 cursor-pointer"
                        >
                          Choose File
                        </label>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-sm text-slate-400">Database Locked</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Please login with Google to unlock</p>
                        </div>
                        <button 
                          onClick={handleLogin}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                          Login to Upload
                        </button>
                      </div>
                    )}
                  </div>
                )}

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Quick Stats
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-xl font-bold text-indigo-600">{events.length}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Events</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-xl font-bold text-indigo-600">{uniqueTechs.length}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Techs</div>
                      </div>
                    </div>
                  </div>

                  {user && (
                    <button 
                      onClick={() => {
                          if (confirm("Are you sure you want to reset the database to default sample data?")) {
                            parseCSV(INITIAL_CSV, true);
                          }
                      }}
                      className="w-full text-xs text-rose-500 font-bold hover:bg-rose-50 p-2 rounded-lg transition-colors border border-rose-100"
                    >
                      Reset Database to Default
                    </button>
                  )}
                </div>

                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between gap-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                       <Database className="w-4 h-4 text-indigo-600" />
                       Raw Schedule Data
                    </h3>
                    <div className="relative">
                       <input 
                         type="text" 
                         placeholder="Search KOL or Tech..." 
                         className="pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-48 outline-none focus:ring-2 focus:ring-indigo-500"
                         onChange={(e) => {
                            const val = e.target.value.toLowerCase();
                            // Client side filtering for visual purposes
                         }}
                       />
                       <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-slate-100">
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Asset</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Live Date</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">KOL Name</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Studio</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Techs / Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(isGridEditMode ? gridEvents : events).map((event, idx) => (
                          <tr key={event.id} className={cn(
                            "transition-colors group",
                            isGridEditMode ? "" : "hover:bg-slate-50 cursor-pointer"
                          )} onClick={() => { if (!isGridEditMode) { setSelectedEvent(event); setIsEditing(false); setIsAdding(false); } }}>
                            <td className="p-2">
                              {isGridEditMode ? (
                                <select 
                                  className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500"
                                  value={event.asset}
                                  onChange={(e) => handleGridChange(idx, 'asset', e.target.value)}
                                >
                                  {Array.from(new Set([...assetTypes, 'SLD', 'D-DAY', 'SBD', 'MID-MONTH', 'PAYDAY', 'BARTER', 'MC'])).sort().map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{event.asset}</span>
                              )}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {isGridEditMode ? (
                                <div className="flex flex-col gap-1">
                                  <input 
                                    type="date"
                                    className="bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                                    value={event.parsedDate ? format(event.parsedDate instanceof Date ? event.parsedDate : new Date(event.parsedDate), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => handleGridChange(idx, 'parsedDate', new Date(e.target.value))}
                                  />
                                  <div className="flex gap-1">
                                    <input className="w-1/2 bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-[9px]" value={event.liveTime || ''} placeholder="Start" onChange={(e) => handleGridChange(idx, 'liveTime', e.target.value)}/>
                                    <input className="w-1/2 bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-[9px]" value={event.endTime || ''} placeholder="End" onChange={(e) => handleGridChange(idx, 'endTime', e.target.value)}/>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium text-xs">{event.liveDate}</div>
                                  <div className="text-[10px] text-slate-400">{event.liveTime} - {event.endTime}</div>
                                </>
                              )}
                            </td>
                            <td className="p-2">
                               {isGridEditMode ? (
                                 <input 
                                   className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                   value={event.kolName || ''}
                                   placeholder="KOL Name"
                                   onChange={(e) => handleGridChange(idx, 'kolName', e.target.value)}
                                 />
                               ) : (
                                 <div className="font-semibold text-slate-800 text-xs">{event.kolName}</div>
                               )}
                            </td>
                            <td className="p-2">
                               {isGridEditMode ? (
                                 <input 
                                   className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-indigo-500"
                                   value={event.studio || ''}
                                   placeholder="Studio"
                                   onChange={(e) => handleGridChange(idx, 'studio', e.target.value)}
                                 />
                               ) : (
                                 <span className="text-xs text-slate-500">{event.studio}</span>
                               )}
                            </td>
                            <td className="p-2">
                               {isGridEditMode ? (
                                 <div className="flex gap-1">
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px]" value={event.tech1 || ''} placeholder="T1" onChange={(e) => handleGridChange(idx, 'tech1', e.target.value)}/>
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px]" value={event.tech2 || ''} placeholder="T2" onChange={(e) => handleGridChange(idx, 'tech2', e.target.value)}/>
                                    <input className="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[11px]" value={event.tech3 || ''} placeholder="T3" onChange={(e) => handleGridChange(idx, 'tech3', e.target.value)}/>
                                 </div>
                               ) : (
                                 <div className="flex items-center justify-between gap-2">
                                   <div className="flex flex-wrap gap-1">
                                      {[event.tech1, event.tech2, event.tech3].filter(Boolean).map((t, i) => (
                                        <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                           {t}
                                        </span>
                                      ))}
                                   </div>
                                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setIsEditing(true); setFormData({...event}); }}
                                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-md"
                                      >
                                        <Menu size={14} />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md"
                                      >
                                        <X size={14} />
                                      </button>
                                   </div>
                                 </div>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                    Showing {events.length} schedule entries
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-600 font-bold text-sm tracking-widest animate-pulse uppercase">Syncing Database...</p>
          </div>
        </div>
      )}

      {/* Day Summary Modal */}
      <AnimatePresence>
        {daySummaryDate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDaySummaryDate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="bg-indigo-500 p-3 rounded-2xl">
                      <CalendarIcon className="w-6 h-6 text-white" />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold">{format(daySummaryDate, 'EEEE, d MMMM yyyy')}</h2>
                      <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                        {eventsForDay(daySummaryDate).length} Scheduled Sessions
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => setDaySummaryDate(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventsForDay(daySummaryDate).length > 0 ? (
                    eventsForDay(daySummaryDate).map(event => (
                      <div 
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setDaySummaryDate(null);
                        }}
                        className={cn(
                          "bg-white p-4 rounded-2xl border-l-4 shadow-sm border-slate-200 hover:shadow-md transition-all cursor-pointer group",
                          getAssetStyle(event.asset)
                        )}
                      >
                         <div className="flex justify-between items-start mb-3">
                            <span className="bg-black/5 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-tight">
                              {event.asset}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                              {event.studio}
                            </span>
                         </div>
                         
                         <h3 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors text-sm">
                            {event.kolName}
                         </h3>

                         <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                               <Clock className="w-3.5 h-3.5 text-indigo-400" />
                               <span>{event.liveTime} - {event.endTime}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                               <User className="w-3.5 h-3.5 text-indigo-400" />
                               <span className="truncate">
                                 {[event.tech1, event.tech2, event.tech3].filter(Boolean).join(', ')}
                               </span>
                            </div>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                       <CalendarIcon size={64} className="mb-4 opacity-20" />
                       <p className="font-bold text-lg">No events scheduled for this day</p>
                    </div>
                  )}
                </div>
              </div>

              {user && (
                 <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
                    <button 
                      onClick={() => {
                        handleAddEvent(daySummaryDate);
                        setDaySummaryDate(null);
                      }}
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Plus size={18} /> Add New Session
                    </button>
                 </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Status Toast */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 24, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={cn(
              "fixed left-1/2 z-[110] px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-3 min-w-[300px]",
              uploadStatus.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              uploadStatus.type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}>
              {uploadStatus.type === 'success' ? '✓' : '!'}
            </div>
            <p className="font-semibold text-sm">{uploadStatus.message}</p>
            <button onClick={() => setUploadStatus(null)} className="ml-auto opacity-50 hover:opacity-100 italic text-[10px]">Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Modal for Event Details / Adding / Editing */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-indigo-600 p-6 text-white relative flex-shrink-0">
                <button 
                  onClick={() => { setSelectedEvent(null); setIsEditing(false); setIsAdding(false); setIsDeleting(false); }}
                  className="absolute top-4 right-4 p-1 hover:bg-indigo-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                  {isDeleting ? 'Verify Deletion' : (isAdding ? 'Adding New Event' : (isEditing ? 'Editing Event' : selectedEvent.asset))}
                </div>
                <h3 className="text-2xl font-bold">
                  {isDeleting ? 'Are you sure?' : (isAdding ? 'Create Schedule' : (isEditing ? 'Update Schedule' : selectedEvent.kolName))}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isDeleting ? (
                  <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-2">
                       <X size={32} />
                    </div>
                    <p className="text-slate-700 font-medium">
                      You are about to permanently delete the schedule for <span className="font-bold text-rose-600">{selectedEvent.kolName}</span>. 
                      This action cannot be undone.
                    </p>
                  </div>
                ) : (isEditing || isAdding) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Live Date *</label>
                        <input 
                          type="date" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formData.parsedDate ? format(formData.parsedDate instanceof Date ? formData.parsedDate : new Date(formData.parsedDate), 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) {
                              setFormData({
                                ...formData,
                                parsedDate: newDate,
                                liveDate: format(newDate, 'EEE-d-MMM')
                              });
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">KOL Name *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Air Phantila"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formData.kolName || ''}
                          onChange={(e) => setFormData({...formData, kolName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Asset Type *</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formData.asset || ''}
                          onChange={(e) => setFormData({...formData, asset: e.target.value})}
                        >
                          <option value="" disabled>Select Asset Type</option>
                          {/* Use dynamic types, but ensure common ones are available even if DB is empty */}
                          {Array.from(new Set([...assetTypes, 'SLD', 'D-DAY', 'SBD', 'MID-MONTH', 'PAYDAY', 'BARTER', 'MC'])).sort().map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Live Time</label>
                          <input 
                            type="text" 
                            placeholder="12:00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.liveTime || ''}
                            onChange={(e) => setFormData({...formData, liveTime: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">End Time</label>
                          <input 
                            type="text" 
                            placeholder="14:00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.endTime || ''}
                            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 uppercase">Studio</label>
                         <input 
                            type="text" 
                            placeholder="Studio 1"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.studio || ''}
                            onChange={(e) => setFormData({...formData, studio: e.target.value})}
                          />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Technicians</label>
                        <div className="space-y-2">
                           <input type="text" placeholder="Tech 1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.tech1 || ''} onChange={(e) => setFormData({...formData, tech1: e.target.value})}/>
                           <input type="text" placeholder="Tech 2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.tech2 || ''} onChange={(e) => setFormData({...formData, tech2: e.target.value})}/>
                           <input type="text" placeholder="Tech 3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={formData.tech3 || ''} onChange={(e) => setFormData({...formData, tech3: e.target.value})}/>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Note</label>
                        <textarea 
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                           placeholder="Any special instructions..."
                           value={formData.note || ''}
                           onChange={(e) => setFormData({...formData, note: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                        <div className="font-semibold flex items-center gap-2">
                          <CalendarIcon size={14} className="text-indigo-600" />
                          {selectedEvent.parsedDate && format(selectedEvent.parsedDate, 'EEE, d MMM yyyy')}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Time</label>
                        <div className="font-semibold flex items-center gap-2">
                          <Clock size={14} className="text-indigo-600" />
                          {selectedEvent.liveTime} - {selectedEvent.endTime}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Studio</label>
                        <div className="font-semibold flex items-center gap-2">
                          <Video size={14} className="text-indigo-600" />
                          {selectedEvent.studio}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Asset Mode</label>
                        <div className="font-semibold">{selectedEvent.asset}</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Technical Team</label>
                      <div className="flex flex-wrap gap-2">
                        {[selectedEvent.tech1, selectedEvent.tech2, selectedEvent.tech3]
                          .filter(t => t && t.trim() !== '')
                          .map((t, i) => (
                            <span key={i} className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                              {t}
                            </span>
                          ))}
                        {[selectedEvent.tech1, selectedEvent.tech2, selectedEvent.tech3].filter(Boolean).length === 0 && (
                          <span className="text-xs text-slate-400 italic">No technicians assigned</span>
                        )}
                      </div>
                    </div>

                    {selectedEvent.note && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Note</label>
                        <p className="text-sm text-slate-600 italic bg-amber-50 p-3 rounded-xl border border-amber-100">
                          "{selectedEvent.note}"
                        </p>
                      </div>
                    )}

                    {selectedEvent.leaveStatus && (
                      <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                        <label className="text-[10px] font-bold text-rose-400 uppercase">Status</label>
                        <p className="text-sm text-rose-600 font-medium">{selectedEvent.leaveStatus}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 flex-shrink-0">
                {isDeleting ? (
                  <>
                    <button 
                      onClick={() => selectedEvent.id && handleDeleteEvent(selectedEvent.id)}
                      className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                    >
                      Yes, Delete Now
                    </button>
                    <button 
                      onClick={() => setIsDeleting(false)}
                      className="flex-1 bg-white text-slate-600 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      No, Keep It
                    </button>
                  </>
                ) : (isEditing || isAdding) ? (
                  <>
                    <button 
                      onClick={handleSaveEvent}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      {isAdding ? 'Create Event' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={() => { setIsEditing(false); setIsAdding(false); if (isAdding) setSelectedEvent(null); }}
                      className="flex-1 bg-white text-slate-600 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {user && (
                      <>
                        <button 
                          onClick={handleEditClick}
                          className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                        >
                          <Menu size={18} />
                          Edit Event
                        </button>
                        <button 
                          onClick={() => selectedEvent.id && handleDeleteEvent(selectedEvent.id)}
                          className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-2xl font-bold border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Delete
                        </button>
                      </>
                    )}
                    {!user && (
                       <p className="text-xs text-slate-400 text-center w-full">Login to edit or delete this event</p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-around md:hidden z-40">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={cn(
            "flex flex-col items-center gap-1",
            activeTab === 'calendar' ? "text-indigo-600" : "text-slate-400"
          )}
        >
          <CalendarIcon size={24} />
          <span className="text-[10px] font-bold">Schedule</span>
        </button>
        <button 
          onClick={() => setActiveTab('database')}
          className={cn(
            "flex flex-col items-center gap-1",
            activeTab === 'database' ? "text-indigo-600" : "text-slate-400"
          )}
        >
          <Database size={24} />
          <span className="text-[10px] font-bold">Database</span>
        </button>
      </div>
    </div>
  );
}
