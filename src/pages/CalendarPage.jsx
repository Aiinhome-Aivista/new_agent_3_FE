import CustomSelect from '../components/CustomSelect';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, LayoutGrid, List } from 'lucide-react';
import { getPlans, getMeetings, getHolidays } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const CalendarPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [meetings, setMeetings] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plansMap, setPlansMap] = useState({});
  const timelineContainerRef = useRef(null);
  const scrollTargetRef = useRef(null);

  useEffect(() => {
    // Small timeout ensures the DOM is fully painted before scrolling
    setTimeout(() => {
      if (scrollTargetRef.current) {
        scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (timelineContainerRef.current) {
        timelineContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 100);
  }, [selectedPlan, meetings]);

  const processMeetingsWithDayLabel = (meetingsData) => {
    const sorted = [...meetingsData].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const planCounts = {};
    return sorted.map(m => {
      if (!planCounts[m.plan_id]) planCounts[m.plan_id] = 1;
      else planCounts[m.plan_id]++;
      return { ...m, dayLabel: `Day ${planCounts[m.plan_id]}` };
    });
  };

  const getLocalStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalStr(new Date()));

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const plansRes = await getPlans();
        const fetchedPlans = plansRes.data.data || [];
        let approvedPlans = fetchedPlans.filter(p => p.status?.toLowerCase() === 'approved');
        
        if (user?.role === 'Delivery / Engagement Manager') {
          approvedPlans = approvedPlans.filter(p => String(p.approved_by) === String(user?.id));
        }
        
        setPlans(approvedPlans);
        
        const map = {};
        approvedPlans.forEach(p => map[p.id] = p.application_name);
        setPlansMap(map);

        const meetingsRes = await getMeetings();
        let fetchedMeetings = meetingsRes.data.data || [];
        
        if (user?.role === 'Delivery / Engagement Manager') {
          const allowedPlanIds = approvedPlans.map(p => p.id);
          fetchedMeetings = fetchedMeetings.filter(m => allowedPlanIds.includes(m.plan_id));
        }
        
        setAllMeetings(fetchedMeetings);
        setMeetings(processMeetingsWithDayLabel(fetchedMeetings));
        
        const holidaysRes = await getHolidays();
        setHolidays(holidaysRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch data for calendar", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handlePlanChange = (e) => {
    const val = e.target.value;
    setSelectedPlan(val);
    if (val === 'All') {
      setMeetings(processMeetingsWithDayLabel(allMeetings));
    } else {
      setMeetings(processMeetingsWithDayLabel(allMeetings.filter(m => String(m.plan_id) === String(val))));
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const renderCells = () => {
    const cells = [];
    let day = 1;

    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`prev-${i}`} className="min-h-[120px] p-2 bg-light-background border border-light-border text-secondary-text">
          <div className="flex justify-between items-start">
            <span className="text-sm">{prevMonthDays - firstDay + i + 1}</span>
            {i === firstDay - 1 && <span className="text-sm font-medium">{monthNames[currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1].substring(0, 3)}</span>}
          </div>
        </div>
      );
    }

    for (let i = 0; i < daysInMonth; i++) {
      const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
      
      const currentCellDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = currentCellDateStr === selectedDateStr;

      const dayMeetings = meetings.filter(m => {
          if(!m.scheduled_at) return false;
          const mDate = new Date(m.scheduled_at);
          return mDate.getUTCDate() === day && mDate.getUTCMonth() === currentDate.getMonth() && mDate.getUTCFullYear() === currentDate.getFullYear();
      });

      const holiday = holidays.find(h => {
          if(!h.holiday_date) return false;
          const hDate = new Date(h.holiday_date);
          return hDate.getUTCDate() === day && hDate.getUTCMonth() === currentDate.getMonth() && hDate.getUTCFullYear() === currentDate.getFullYear();
      });

      cells.push(
        <div key={`curr-${i}`} 
             onClick={() => setSelectedDateStr(currentCellDateStr)}
             className={`min-h-[120px] p-2 border border-light-border transition-colors cursor-pointer flex flex-col ${isToday ? 'bg-input-background' : holiday ? 'bg-red-50 hover:bg-red-100' : 'bg-light-background hover:bg-input-background'} ${isSelected ? 'ring-2 ring-orange-border ring-inset' : ''}`}>
           <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
                <span className={`text-sm ${isToday ? 'bg-primary-orange text-white rounded-full w-6 h-6 flex items-center justify-center' : holiday ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{day}</span>
                {holiday && <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded truncate max-w-[100px]" title={holiday.holiday_name}>{holiday.holiday_name}</span>}
            </div>
            {day === 1 && <span className="text-sm font-medium text-gray-700">{monthNames[currentDate.getMonth()].substring(0, 3)}</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {dayMeetings.map(meeting => (
              <div key={meeting.id} className={`text-xs p-1.5 border rounded flex flex-col gap-1 overflow-hidden shadow-sm ${meeting.status?.toLowerCase() === 'completed' ? 'bg-input-background text-secondary-text border-light-border' : 'bg-input-background text-hover-orange border-orange-border'}`} title={`${meeting.title}\n${new Date(meeting.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}${meeting.meeting_link ? `\nLink: ${meeting.meeting_link}` : ''}`}>
                 <div className="flex items-start gap-1">
                   <span className={`w-1.5 h-1.5 mt-1 rounded-full flex-shrink-0 ${meeting.status?.toLowerCase() === 'completed' ? 'bg-gray-400' : 'bg-primary-orange'}`}></span>
                   {meeting.meeting_link ? (
                     <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="truncate font-semibold leading-tight hover:underline cursor-pointer">{meeting.title || 'KT Session'}</a>
                   ) : (
                     <span className="truncate font-semibold leading-tight">{meeting.title || 'KT Session'}</span>
                   )}
                 </div>
                 <div className="flex justify-between items-center text-[10px] text-secondary-text">
                    <span>{new Date(meeting.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}</span>
                    {selectedPlan === 'All' && plansMap[meeting.plan_id] && (
                        <span className="truncate max-w-[60px] ml-1 opacity-70" title={plansMap[meeting.plan_id]}>({plansMap[meeting.plan_id]})</span>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      );
      day++;
    }

    const remainingCells = 42 - cells.length; 
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
         <div key={`next-${i}`} className="min-h-[120px] p-2 bg-light-background border border-light-border text-secondary-text">
          <div className="flex justify-between items-start">
            <span className="text-sm">{i}</span>
             {i === 1 && <span className="text-sm font-medium">{monthNames[currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1].substring(0, 3)}</span>}
          </div>
        </div>
      );
    }

    return cells;
  };

  const renderTimeline = () => {
    const validMeetings = meetings.filter(m => !!m.scheduled_at);

    const grouped = {};
    validMeetings.forEach(m => {
       const mDate = new Date(m.scheduled_at);
       const dateStr = `${mDate.getUTCFullYear()}-${String(mDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mDate.getUTCDate()).padStart(2, '0')}`;
       if(!grouped[dateStr]) grouped[dateStr] = [];
       grouped[dateStr].push(m);
    });

    const sortedDates = Object.keys(grouped).sort();
    const todayStrGlobal = new Date().toISOString().split('T')[0];
    const upcomingDateStr = sortedDates.find(d => d >= todayStrGlobal);

    if (sortedDates.length === 0) {
      return (
        <div className="py-8 text-center text-secondary-text text-sm bg-light-background rounded-xl border border-light-border w-full">
          No schedules found for this plan.
        </div>
      );
    }

    return (
      <div className="bg-light-background rounded-xl shadow-sm border border-light-border p-5 w-full">
        <h3 className="font-semibold text-primary-text mb-4 text-sm">Plan Timeline</h3>
        <div ref={timelineContainerRef} className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex relative mt-4">
            {sortedDates.map((dateStr, index) => {
              const dateObj = new Date(dateStr);
              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = todayStr === dateStr;
              const isUpcomingScrollTarget = dateStr === upcomingDateStr;
              const isPastDate = dateStr < todayStr;
              const dayItems = grouped[dateStr].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
              const isDateCompleted = dayItems.every(m => m.status?.toLowerCase() === 'completed');
              const isDateOverdue = isPastDate && !isDateCompleted;

              return (
                <div key={dateStr} className="relative min-w-[280px] pr-8" ref={isUpcomingScrollTarget ? scrollTargetRef : null}>
                  {/* Horizontal line connecting to next item */}
                  {index < sortedDates.length - 1 && (
                    <div className={`absolute top-[7px] left-[16px] w-[calc(100%+8px)] h-[2px] ${isDateCompleted ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  )}
                  {/* Date dot */}
                  <div className={`absolute left-0 top-0 h-4 w-4 rounded-full border-2 border-white z-10 ${isDateCompleted ? 'bg-green-500 ring-2 ring-green-200' : (isToday ? 'bg-primary-orange ring-2 ring-orange-200 animate-pulse' : (isDateOverdue ? 'bg-red-500 ring-2 ring-red-200' : 'bg-gray-300'))}`}></div>
                  <div className="mt-8 ml-0">
                    <h4 className={`text-xs font-bold mb-3 flex items-center gap-2 ${isToday ? 'text-primary-orange' : (isDateOverdue ? 'text-red-600' : 'text-primary-text')}`}>
                      <span>{dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                      {isToday && <span className="text-[9px] bg-input-background text-hover-orange px-1.5 py-0.5 rounded-full font-bold shadow-sm border border-orange-100">Today</span>}
                    </h4>
                    <div className="space-y-3">
                      {dayItems.map((meeting, i) => {
                        const isCompleted = meeting.status?.toLowerCase() === 'completed';
                        const isOverdueItem = isPastDate && !isCompleted;
                        return (
                          <div key={meeting.id} className={`bg-white border rounded-md p-3 hover:shadow-sm transition-shadow ${isCompleted ? 'border-l-4 border-l-green-500 border-y-gray-200 border-r-gray-200' : (isOverdueItem ? 'border-l-4 border-l-red-500 border-y-red-200 border-r-red-200 bg-red-50' : 'border-light-border')}`}>
                            <div className="flex flex-col gap-1.5">
                               <div className="flex justify-between items-start gap-2">
                                 <span className={`text-xs font-semibold ${isOverdueItem ? 'text-red-800' : 'text-primary-text'} leading-tight line-clamp-2`}>
                                   {meeting.dayLabel && <span className={`${isOverdueItem ? 'text-red-600' : 'text-primary-orange'} font-bold mr-1`}>{meeting.dayLabel} -</span>}
                                   {meeting.title || 'KT Session'}
                                 </span>
                                 <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium ${isCompleted ? 'bg-green-100 text-green-800 border border-green-200' : (isOverdueItem ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-input-background text-primary-orange border border-primary-orange/20')}`}>
                                   {isCompleted ? 'Completed' : (isOverdueItem ? 'Overdue' : 'Upcoming')}
                                 </span>
                               </div>
                               <p className="text-[10px] text-secondary-text flex items-center flex-wrap gap-1 mt-1">
                                 <span>{new Date(meeting.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}</span>
                               </p>
                               {meeting.meeting_link && (
                                 <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary-orange hover:underline mt-1 w-max font-medium">
                                   Join Meeting
                                 </a>
                               )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading && plans.length === 0) return <Loader />;

  return (
    <div className="p-6 w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-primary-text flex items-center">
          KT Schedule Calendar 
          {user?.name && <span className="ml-3 text-sm font-normal text-primary-orange bg-input-background px-3 py-1 rounded-full">{user.name}</span>}
        </h1>
        
        <div className="flex items-center space-x-2 bg-light-background px-4 py-2 rounded-lg shadow-sm border border-light-border w-full md:w-auto xl:w-[400px]">
          <Filter size={16} className="text-secondary-text flex-shrink-0" />
          <span className="text-sm font-medium text-secondary-text whitespace-nowrap">Plan:</span>
          <CustomSelect 
            value={selectedPlan}
            onChange={handlePlanChange}
            className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-primary-text font-semibold outline-none py-1 pl-1 w-full truncate"
          >
            <option value="All">All Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </CustomSelect>
        </div>
      </div>

      {selectedPlan !== 'All' && renderTimeline()}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Calendar Main Section */}
        <div className="flex-1 bg-light-background rounded-xl shadow-sm border border-light-border overflow-hidden">
          {/* Calendar Header Controls */}
          <div className="p-4 border-b border-light-border flex justify-between items-center bg-light-background">
            <div className="flex items-center space-x-4">
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 border border-light-border bg-light-background rounded text-sm font-medium text-gray-700 hover:bg-light-background transition-colors shadow-sm">Today</button>
              <div className="flex items-center bg-light-background border border-light-border rounded shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-light-background border-r border-light-border text-secondary-text transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-light-background text-secondary-text transition-colors"><ChevronRight size={20} /></button>
              </div>
              <div className="flex items-center ml-2 md:ml-4 gap-1">
                <CustomSelect
                  value={currentDate.getMonth()}
                  onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
                  className="text-xl font-bold text-primary-text bg-transparent border border-transparent hover:border-light-border rounded px-2 py-1 focus:ring-0 cursor-pointer outline-none"
                >
                  {monthNames.map((month, index) => (
                    <option key={month} value={index} className="text-base">{month}</option>
                  ))}
                </CustomSelect>
                <CustomSelect
                  value={currentDate.getFullYear()}
                  onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
                  className="text-xl font-bold text-primary-text bg-transparent border border-transparent hover:border-light-border rounded px-2 py-1 focus:ring-0 cursor-pointer outline-none"
                >
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                    <option key={year} value={year} className="text-base">{year}</option>
                  ))}
                </CustomSelect>
              </div>
            </div>
            
            {loading && <div className="text-sm text-secondary-text animate-pulse hidden sm:block">Refreshing...</div>}
          </div>

          {/* Calendar Grid */}
          <div className="bg-input-background">
             <div className="grid grid-cols-7 text-center border-b border-light-border bg-light-background">
               {dayNames.map(day => (
                 <div key={day} className="py-3 text-xs md:text-sm font-semibold text-secondary-text border-r border-light-border last:border-r-0">
                   <span className="hidden md:inline">{day}</span>
                   <span className="md:hidden">{day.substring(0, 3)}</span>
                 </div>
               ))}
             </div>
             <div className="grid grid-cols-7 bg-light-background">
               {renderCells()}
             </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[400px] flex flex-col gap-6 h-fit sticky top-6">
          
          {/* Upcoming Summary Card */}
          <div className="bg-light-background rounded-xl shadow-sm border border-light-border p-5">
             <h3 className="font-semibold text-primary-text mb-4 text-sm">Schedules</h3>
           
           <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
             <span className="text-sm font-medium text-gray-700">Selected Date</span>
             <div className="flex items-center border border-light-border rounded px-2 py-1 text-sm bg-light-background">
               {new Date(selectedDateStr).toLocaleDateString('en-GB')} <CalendarIcon size={14} className="ml-2 text-secondary-text" />
             </div>
           </div>

           <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
             {meetings
                .filter(m => {
                  if(!m.scheduled_at) return false;
                  const mDate = new Date(m.scheduled_at);
                  const mDateStr = `${mDate.getUTCFullYear()}-${String(mDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mDate.getUTCDate()).padStart(2, '0')}`;
                  return mDateStr === selectedDateStr;
                })
                .sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                .map(m => (
                 <div key={m.id} className={`border-l-4 pl-3 py-1 mb-4 ${m.status?.toLowerCase() === 'completed' ? 'border-green-500' : 'border-primary-orange'}`} title={`${m.title || 'KT Session'}\n${new Date(m.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}${m.meeting_link ? `\nLink: ${m.meeting_link}` : ''}`}>
                   {m.meeting_link ? (
                     <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-text truncate hover:underline cursor-pointer block">{m.title || 'KT Session'}</a>
                   ) : (
                     <p className="text-sm font-semibold text-primary-text truncate">{m.title || 'KT Session'}</p>
                   )}
                   <p className="text-xs text-secondary-text mt-1 font-medium">
                     {new Date(m.scheduled_at).toLocaleDateString(undefined, {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'})} at {new Date(m.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}
                   </p>
                   {plansMap[m.plan_id] && (
                     <p className="text-[10px] text-secondary-text mt-1 truncate">{plansMap[m.plan_id]}</p>
                   )}
                 </div>
             ))}
             {meetings.filter(m => {
                  if(!m.scheduled_at) return false;
                  const mDate = new Date(m.scheduled_at);
                  const mDateStr = `${mDate.getUTCFullYear()}-${String(mDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mDate.getUTCDate()).padStart(2, '0')}`;
                  return mDateStr === selectedDateStr;
                }).length === 0 && (
                 <p className="text-sm text-secondary-text italic text-center py-4">No schedules found for this date.</p>
             )}
           </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
