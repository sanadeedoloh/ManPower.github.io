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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { ScheduleEvent, CSVRow } from './types';

// Initial data provided by user
const INITIAL_CSV = `Asset,Live Date,Live Time,End Time,KOL name,Studio,Tech 1,Tech 2,Tech 3,Leave = ไม่แยู่,Note
SLD,Fri-1-May,12:00,14:00,Air Phantila,Studio 1,Dee,Geng,,,
SLD,Fri-1-May,12:00,14:00,Nue,Studio 5,Oat,K,,,
SBD HP#2,Fri-1-May,12:00,14:00,Plustor,Studio 2,Jay,,,,
SLD,Fri-1-May,18:00,20:00,Namtan Chalita,Studio 2,PK,PK,,,
SLD,Fri-1-May,18:00,20:00,Tack Pharunyoo,Studio 1,Dee,Geng,,,
SLD,Fri-1-May,20:00,22:00,Tao AF,Studio 2,PK,PK,,,
SLD,Fri-1-May,20:00,23:00,Thank After Yum,Studio 1,Dee,Geng,Jay,,
SBD HP#2,Sat-2-May,12:00,14:00,Dutdew,Studio 2,Dee,,,Oat ไม่อยู่,
SBD HP#2,Sun-3-May,12:00,14:00,Preawah,Studio 2,Jay,,,Oat ไม่อยู่,
D-Day,Mon-4-May,23:00,1:00,Thank After Yum,Studio 5,Dee,Geng,Jay,,
D-Day,Tue-5-May,12:00,14:00,Cheer,Studio 5,Dee,Geng,,,
D-Day,Tue-5-May,12:00,14:00,Tonhorm,Studio 4,Freelance,Freelance,,,
Barter Tier 1,Tue-5-May,12:00,13:00,PeemWasu,Studio 2,Oat,K,,,
D-Day,Tue-5-May,18:00,20:00,Ning Panita,Studio 5,Dee,Geng,,,
D-Day,Tue-5-May,18:00,20:00,Luke Ishikawa,Studio 4,PK,PK,,,
Barter Tier 1,Tue-5-May,19:00,20:00,Perth,Studio 2,Oat,K,,,
D-Day,Tue-5-May,20:00,23:00,Thank After Yum,Studio 5,Dee,Geng,Jay,,
D-Day,Tue-5-May,20:00,22:00,Boy Pakorn,Studio 4,PK,PK,,,
MC x Celeb,Thu-7-May,10:00,12:00,Air Phantila,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-7-May,12:00,14:00,Michelle,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-7-May,17:00,19:00,Orio,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-7-May,20:00,22:00,Nue,Studio 1,Jay,Geng,,,
Barter Tier 1,Thu-7-May,20:00,21:00,Namping,Studio 2,Oat,K,,,
SBD HP#2,Fri-8-May,12:00,14:00,Air Phantila,Studio 2,Dee,,,,
SBD HP#1,Sat-9-May,12:00,14:00,Cheer Thikamporn,Studio 2,Jay,,,D ไม่อยู่,
SBD HP#2,Mon-11-May,12:00,14:00,Air Phantila,Studio 2,Geng,,,D ไม่อยู่,
MC x Celeb,Tue-12-May,10:00,12:00,Lily,Studio 1,Oat,K,,,
MC x Celeb,Tue-12-May,12:00,14:00,Tum Warawut,Studio 1,Oat,K,,,
SBD HP#1,Tue-12-May,12:00,14:00,Cheer Thikamporn,Studio 2,Dee,,,,
MC x Celeb,Tue-12-May,17:00,19:00,Bitoey Rsiam,Studio 1,Oat,K,,,
MC x Celeb,Tue-12-May,20:00,22:00,Nongh Tana,Studio 1,Geng,Jay,,,
MC x Celeb,Wed-13-May,10:00,12:00,Fon Nalinthip,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-13-May,12:00,14:00,Boy Pisanu,Studio 1,Dee,Geng,,,
SBD HP#1,Wed-13-May,12:00,14:00,Preawah,Studio 2,Oat,,,,
MC x Celeb,Wed-13-May,17:00,19:00,Giftza Piya,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-13-May,20:00,22:00,Lala,Studio 1,Oat,Geng,Jay,,
MC x Celeb,Thu-14-May,10:00,12:00,Toy Pathompong,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-14-May,12:00,14:00,Jooy,Studio 1,Dee,Geng,,,
SBD HP#1,Thu-14-May,12:00,14:00,Cheer Thikamporn,Studio 2,K,,,,
MC x Celeb,Thu-14-May,17:00,19:00,Noon Ramida,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-14-May,20:00,22:00,Dj Push,Studio 1,Oat,Jay,,,
Mid-Month,Fri-15-May,10:00,12:00,Giftza Piya,Studio 1,Dee,Geng,,,
Mid-Month,Fri-15-May,10:00,12:00,Plustor,Studio 5,Oat,K,,,
Mid-Month,Fri-15-May,12:00,14:00,Aerin,Studio 1,Dee,Geng,,,
Mid-Month,Fri-15-May,12:00,14:00,Tonhorm,Studio 5,Oat,K,,,
Mid-Month,Fri-15-May,18:00,20:00,Michelle,Studio 1,Dee,Geng,,,
Mid-Month,Fri-15-May,18:00,20:00,Seya Thongchua,Studio 5,PK,PK,,,
Mid-Month,Fri-15-May,20:00,22:00,Gavind,Studio 5,PK,PK,,,
Mid-Month,Fri-15-May,20:00,23:00,Thank After Yum,Studio 1,Dee,Geng,Jay,,
SBD HP#1,Sat-16-May,12:00,14:00,Air Phantila,Studio 2,Dee,,,,
SBD HP#2,Sun-17-May,12:00,14:00,Preawah,Studio 2,Jay,,,,
SBD HP#2,Mon-18-May,12:00,14:00,Plustor,Studio 2,K,,,,
MC x Celeb,Tue-19-May,10:00,12:00,Michelle,Studio 1,Dee,Geng,,,
MC x Celeb,Tue-19-May,12:00,14:00,Namtan Chalita,Studio 1,Dee,Geng,,,
SBD HP#2,Tue-19-May,12:00,14:00,Preawah,Studio 2,Oat,,,,
MC x Celeb,Tue-19-May,17:00,19:00,Air Phantila,Studio 1,Dee,Geng,,,
MC x Celeb,Tue-19-May,20:00,22:00,Ohn sri1000,Studio 1,Oat,Jay,,,
MC x Celeb,Wed-20-May,10:00,12:00,DJ Dada,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-20-May,12:00,14:00,Plustor,Studio 1,Dee,Geng,,,
SBD HP#1,Wed-20-May,12:00,14:00,Cheer Thikamporn,Studio 2,K,,,,
MC x Celeb,Wed-20-May,17:00,19:00,Tack Pharunyoo,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-20-May,20:00,22:00,Chin Chinawut,Studio 1,Dee,Jay,,,
MC x Celeb,Thu-21-May,10:00,12:00,Milla Marisa,Studio 1,Oat,K,,,
MC x Celeb,Thu-21-May,12:00,14:00,Tubtim Anyarin,Studio 1,Oat,K,,,
SBD HP#2,Thu-21-May,12:00,14:00,Plustor,Studio 2,Dee,,,,
MC x Celeb,Thu-21-May,17:00,19:00,Ball Kummun,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-21-May,20:00,22:00,Bifern Passakorn,Studio 1,Dee,Geng,,,
SBD HP#2,Fri-22-May,12:00,14:00,Air Phantila,Studio 2,K,,,,
SBD HP#2,Sat-23-May,12:00,14:00,Cheer Thikamporn,Studio 2,Jay,,,,
SBD HP#2,Sun-24-May,12:00,14:00,Cheer Thikamporn,Studio 2,Dee,,,,
Payday,Mon-25-May,10:00,12:00,Pearwah,Studio 1,Oat,K,,,
Payday,Mon-25-May,10:00,12:00,Air Phantila,Studio 5,Dee,Geng,,,
Payday,Mon-25-May,12:00,14:00,Ning Panita,Studio 5,Dee,Geng,,,
Payday,Mon-25-May,12:00,14:00,Cheer,Studio 1,Oat,K,,,
Payday,Mon-25-May,18:00,20:00,Aerin,Studio 1,Dee,Geng,Jay,,
Payday,Mon-25-May,18:00,20:00,Kwan Usamanee,Studio 5,PK,PK,,,
Payday,Mon-25-May,20:00,22:00,Dutdew,Studio 1,Dee,Geng,Jay,,
Payday,Mon-25-May,20:00,22:00,Pancake Khemanit,Studio 5,PK,PK,,,
MC x Celeb,Tue-26-May,10:00,12:00,Fon Nalinthip,Studio 1,Oat,K,,,
MC x Celeb,Tue-26-May,12:00,14:00,Nan Lardapha,Studio 1,Oat,K,,,
SBD HP#2,Tue-26-May,12:00,14:00,Plustor,Studio 2,Dee,,,,
MC x Celeb,Tue-26-May,17:00,19:00,Plustor,Studio 1,Oat,K,,,
MC x Celeb,Tue-26-May,20:00,22:00,Typhoon,Studio 1,Geng,Jay,,,
MC x Celeb,Wed-27-May,10:00,12:00,Orio,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-27-May,12:00,14:00,Nue,Studio 1,Dee,Geng,,,
SBD HP#2,Wed-27-May,12:00,14:00,Cheer Thikamporn,Studio 2,K,,,,
MC x Celeb,Wed-27-May,17:00,19:00,Giftza Piya,Studio 1,Dee,Geng,,,
MC x Celeb,Wed-27-May,20:00,22:00,Dutdew,Studio 1,Oat,K,Jay,,
MC x Celeb,Thu-28-May,10:00,12:00,Joy Rinlanee,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-28-May,12:00,14:00,Ice Papitchaya,Studio 1,Dee,Geng,,,
SBD HP#1,Thu-28-May,12:00,14:00,Air Phantila,Studio 2,Oat,,,,
MC x Celeb,Thu-28-May,17:00,19:00,CherreenHvk,Studio 1,Dee,Geng,,,
MC x Celeb,Thu-28-May,20:00,22:00,Pae Mild,Studio 1,Oat,K,,,
SBD HP#2 (Upsize),Fri-29-May,14:00,16:00,Dutdew,Studio 2,Dee,,,,
SBD HP#1,Sat-30-May,12:00,14:00,Dutdew,Studio 2,Jay,,,,
SBD HP#1,Sun-31-May,12:00,14:00,Preawah,Studio 2,Dee,,,,`;

export default function App() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'database'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedTech, setSelectedTech] = useState<string>('All');

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
  const parseCSV = (csvString: string) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedEvents: ScheduleEvent[] = results.data.map((row: any, index: number) => {
          const dateStr = row['Live Date'] || ''; // e.g. Fri-1-May
          const parts = dateStr.split('-');
          let parsedDate = new Date();
          
          if (parts.length === 3) {
            const day = parseInt(parts[1]);
            const monthStr = parts[2]; // e.g. May
            // Assuming current year 2026 for now
            parsedDate = parse(`${day} ${monthStr} 2026`, 'd MMM yyyy', new Date());
          }

          return {
            id: `event-${index}`,
            asset: row['Asset'],
            liveDate: dateStr,
            parsedDate,
            liveTime: row['Live Time'],
            endTime: row['End Time'],
            kolName: row['KOL name'],
            studio: row['Studio'],
            tech1: row['Tech 1'],
            tech2: row['Tech 2'],
            tech3: row['Tech 3'],
            leaveStatus: row['Leave = ไม่แยู่'],
            note: row['Note'],
          };
        });
        setEvents(parsedEvents);
        localStorage.setItem('live_schedule_data', csvString);
      },
    });
  };

  // Initial load
  useEffect(() => {
    const savedData = localStorage.getItem('live_schedule_data');
    parseCSV(savedData || INITIAL_CSV);
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

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
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
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
          
          <nav className="flex bg-slate-100 p-1 rounded-full">
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
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-x-4 gap-y-2 items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">Asset Types:</span>
                {['SLD', 'D-DAY', 'SBD', 'MID-MONTH', 'PAYDAY', 'BARTER', 'MC'].map(type => {
                    const style = getAssetStyle(type);
                    // Extract color class base (e.g., blue-500 -> blue)
                    const colorBase = style.split(' ')[0].split('-')[1];
                    return (
                        <div key={type} className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-sm border-l-2", style.split(' ')[0], style.split(' ')[1])}></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{type}</span>
                        </div>
                    );
                })}
              </div>

              {/* Calendar Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between md:justify-start gap-4">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 hidden sm:block">
                      Today
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="tech-filter" className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Filter Tech:</label>
                  <select 
                    id="tech-filter"
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="flex-1 md:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="All">All Technicians</option>
                    {uniqueTechs.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Calendar View */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
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
                      className={cn(
                        "min-h-[100px] md:min-h-[140px] bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-slate-50",
                        !isCurrentMonth && "bg-slate-50 opacity-40"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                          isDayToday ? "bg-indigo-600 text-white" : "text-slate-600"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px] md:max-h-[110px] scrollbar-thin scrollbar-thumb-slate-200">
                        {dayEvents.map(event => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={cn(
                              "text-[9px] md:text-xs text-left border-l-2 p-1 rounded transition-all active:scale-95 flex flex-col gap-0.5 shadow-sm shrink-0",
                              getAssetStyle(event.asset),
                              selectedTech !== 'All' && (event.tech1?.trim() === selectedTech || event.tech2?.trim() === selectedTech || event.tech3?.trim() === selectedTech) ? "ring-2 ring-offset-1 ring-indigo-500 scale-[1.02] z-10" : ""
                            )}
                          >
                            <div className="flex justify-between items-center text-[8px] md:text-[10px]">
                              <span className="font-bold opacity-80">{event.liveTime}</span>
                              <span className="opacity-60 bg-black/5 px-1 rounded">{event.studio.replace('Studio ', 'S')}</span>
                            </div>
                            <div className="truncate font-semibold">{event.kolName}</div>
                            <div className="text-[8px] md:text-[9px] opacity-70 font-medium flex gap-1 items-center mt-0.5 border-t border-black/5 pt-0.5 truncate">
                              <User size={8} className="shrink-0" />
                              <span className="truncate">
                                {[event.tech1, event.tech2, event.tech3].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </button>
                        ))}
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
                    .filter(e => e.parsedDate >= monthStart && e.parsedDate <= monthEnd)
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
                  <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Upload New CSV</p>
                      <p className="text-xs text-slate-400">Standard structure required</p>
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
                  </div>

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

                  <button 
                    onClick={() => {
                        localStorage.removeItem('live_schedule_data');
                        parseCSV(INITIAL_CSV);
                    }}
                    className="w-full text-xs text-rose-500 font-bold hover:bg-rose-50 p-2 rounded-lg transition-colors border border-rose-100"
                  >
                    Reset to Default Data
                  </button>
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
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-slate-100">
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Asset</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Live Date</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">KOL Name</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Studio</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase">Techs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {events.map((event) => (
                          <tr key={event.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setSelectedEvent(event); setActiveTab('calendar'); }}>
                            <td className="p-3">
                               <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{event.asset}</span>
                            </td>
                            <td className="p-3 whitespace-nowrap text-xs">
                               <div className="font-medium">{event.liveDate}</div>
                               <div className="text-[10px] text-slate-400">{event.liveTime} - {event.endTime}</div>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">{event.kolName}</td>
                            <td className="p-3">
                               <span className="text-xs text-slate-500">{event.studio}</span>
                            </td>
                            <td className="p-3">
                               <div className="flex flex-wrap gap-1">
                                  {[event.tech1, event.tech2, event.tech3].filter(Boolean).map((t, i) => (
                                    <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                       {t}
                                    </span>
                                  ))}
                               </div>
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

      {/* Floating Modal for Event Details */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white relative">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 p-1 hover:bg-indigo-500 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{selectedEvent.asset}</div>
                <h3 className="text-2xl font-bold">{selectedEvent.kolName}</h3>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                    <div className="font-semibold flex items-center gap-2">
                       <CalendarIcon size={14} className="text-indigo-600" />
                       {format(selectedEvent.parsedDate, 'EEE, d MMM yyyy')}
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
                      <p className="text-xs text-rose-600 font-bold">⚠️ {selectedEvent.leaveStatus}</p>
                   </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Close Detail
                </button>
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
