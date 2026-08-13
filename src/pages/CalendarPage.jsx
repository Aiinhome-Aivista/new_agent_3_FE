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
      if (scrollTargetRef.current && timelineContainerRef.current) {
        const container = timelineContainerRef.current;
        const target = scrollTargetRef.current;
        const scrollLeft = target.offsetLeft - (container.clientWidth / 2) + (target.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      } else if (timelineContainerRef.current) {
        timelineContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, 300);
  }, [selectedPlan, meetings, loading]);

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

    const todayStrGlobal = new Date().toISOString().split('T')[0];
    if (!grouped[todayStrGlobal]) {
      grouped[todayStrGlobal] = [];
    }

    const sortedDates = Object.keys(grouped).sort();
    const upcomingDateStr = sortedDates.find(d => d >= todayStrGlobal);

    return (
      <div className="bg-light-background rounded-xl shadow-sm border border-light-border p-6 w-full relative overflow-hidden mb-6">
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
        
        {/* Background glow effects - subtle for light theme */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-orange/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h3 className="font-bold text-primary-text text-xl flex items-center">
             <span className="w-1.5 h-6 bg-primary-orange rounded-full mr-3"></span>
             KT Timeline
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-secondary-text bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
             <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-orange animate-pulse shadow-[0_0_8px_rgba(255,107,0,0.6)]"></span> Today</div>
             <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Pending</div>
             <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span> Completed</div>
             <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Cancelled / Overdue</div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader />
          </div>
        ) : (
          <div ref={timelineContainerRef} className="h-[220px] overflow-auto hide-scrollbar relative z-10 scroll-smooth rounded-xl">
            <div className="pt-32 pb-32 min-w-max">
              <div className={`flex items-center relative px-12 ${sortedDates.length === 1 ? 'justify-center w-full min-w-full' : 'min-w-max'}`}>
                {/* The main continuous horizontal line */}
                <div className="absolute left-12 right-12 h-0.5 bg-gray-200 top-1/2 -translate-y-1/2"></div>
              
              {sortedDates.map((dateStr, index) => {
                const dateObj = new Date(dateStr);
                const isToday = todayStrGlobal === dateStr;
                const isUpcomingScrollTarget = dateStr === upcomingDateStr;
                const isPastDate = dateStr < todayStrGlobal;
                const dayItems = grouped[dateStr].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
                const isDateCompleted = dayItems.length > 0 && dayItems.every(m => m.status?.toLowerCase() === 'completed');
                const isDateOverdue = isPastDate && dayItems.length > 0 && !isDateCompleted;

                const isTop = index % 2 === 0;

                // Connect line to previous
                const previousIsCompleted = index > 0 && grouped[sortedDates[index-1]].length > 0 && grouped[sortedDates[index-1]].every(m => m.status?.toLowerCase() === 'completed');
                const thisConnectionCompleted = isDateCompleted && previousIsCompleted;
                
                let nodeColorClass = 'border-gray-300 bg-white';
                let ringClass = '';
                let textColorClass = 'text-gray-500';
                let titleColorClass = 'text-primary-text';
                let nodeCenter = '';
                
                if (isToday) {
                   nodeColorClass = 'border-primary-orange bg-white';
                   ringClass = 'shadow-[0_0_15px_rgba(255,107,0,0.3)] ring-4 ring-primary-orange/10';
                   textColorClass = 'text-primary-orange font-bold';
                   nodeCenter = 'bg-primary-orange';
                } else if (isDateCompleted) {
                   nodeColorClass = 'border-green-500 bg-white';
                   ringClass = 'shadow-[0_0_10px_rgba(34,197,94,0.2)] ring-2 ring-green-500/10';
                   textColorClass = 'text-green-600 font-medium';
                   nodeCenter = 'bg-green-500';
                } else if (isDateOverdue) {
                   nodeColorClass = 'border-red-500 bg-white';
                   textColorClass = 'text-red-600 font-medium';
                   nodeCenter = 'bg-red-500';
                }

                return (
                  <div key={dateStr} className="relative flex flex-col items-center w-56 shrink-0 group" ref={isUpcomingScrollTarget ? scrollTargetRef : null}>
                    
                    {/* Connection line filled if previous is completed and this is completed */}
                    {index > 0 && (
                      <div className={`absolute right-[50%] top-1/2 -translate-y-1/2 h-0.5 w-full -z-10 transition-colors duration-500 ${thisConnectionCompleted ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : (isToday && previousIsCompleted ? 'bg-gradient-to-r from-green-400 to-primary-orange shadow-[0_0_8px_rgba(255,107,0,0.2)]' : 'bg-transparent')}`}></div>
                    )}

                    {/* Content (Top or Bottom) */}
                    <div className={`absolute w-full px-2 ${isTop ? 'bottom-8' : 'top-8'}`}>
                      <div className={`flex flex-col ${isTop ? 'items-center text-center' : 'items-center text-center'} transition-transform duration-300 group-hover:${isTop ? '-translate-y-1' : 'translate-y-1'}`}>
                        
                        {isToday && isTop && (
                          <div className="mb-3 px-3 py-1 bg-orange-50 border border-primary-orange text-primary-orange text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 bg-primary-orange rounded-full animate-pulse"></div>
                             TODAY
                          </div>
                        )}
                        
                        <div className={`text-xs px-3 py-1 rounded-full border ${isToday ? 'border-primary-orange/50 bg-orange-50' : (isDateCompleted ? 'border-green-500/50 bg-green-50' : 'border-gray-200 bg-gray-50')} mb-2 ${textColorClass} tracking-wide shadow-sm`}>
                           {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                        </div>
                        
                        <div className="space-y-2 w-full max-w-[180px] max-h-[90px] overflow-y-auto hide-scrollbar">
                          {dayItems.length === 0 && isToday ? (
                             <div className="text-[11px] text-gray-400 italic font-medium">No plans today</div>
                          ) : (
                            dayItems.map((meeting) => {
                               const isCompleted = meeting.status?.toLowerCase() === 'completed';
                               return (
                                 <div key={meeting.id} className="flex flex-col mb-1.5" title={meeting.title}>
                                   <div className={`text-[11px] truncate ${isCompleted ? 'text-green-600 font-bold' : `${titleColorClass} font-medium`}`}>
                                     {meeting.title || 'KT Session'}
                                   </div>
                                   {isCompleted && (
                                     <div className="text-[9px] text-green-500 font-semibold mt-0.5">
                                       Completed on {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                                     </div>
                                   )}
                                 </div>
                               );
                            })
                          )}
                        </div>

                        {isToday && !isTop && (
                          <div className="mt-3 px-3 py-1 bg-orange-50 border border-primary-orange text-primary-orange text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 bg-primary-orange rounded-full animate-pulse"></div>
                             TODAY
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vertical Connector Line from Node to Content */}
                    <div className={`absolute w-px bg-gray-300 transition-all duration-300 group-hover:bg-primary-orange ${isTop ? 'bottom-3 h-5' : 'top-3 h-5'}`}></div>

                    {/* The Timeline Node */}
                    <div className={`relative z-10 w-4 h-4 rounded-full border-[3px] ${nodeColorClass} ${ringClass} transition-all duration-300 group-hover:scale-125 cursor-pointer`}>
                       {nodeCenter && <div className={`absolute inset-0 m-auto w-1.5 h-1.5 rounded-full ${nodeCenter}`}></div>}
                    </div>

                    {/* Hover tooltip for exact date */}
                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-10 text-[10px] bg-gray-800 text-white px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                       {dateObj.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' })}
                    </div>

                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}
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
