import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { getPlans, getMeetings } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

const CalendarPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plansMap, setPlansMap] = useState({});

  const getLocalStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalStr(new Date()));

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const plansRes = await getPlans();
        const fetchedPlans = plansRes.data.data || [];
        const approvedPlans = fetchedPlans.filter(p => p.status?.toLowerCase() === 'approved');
        setPlans(approvedPlans);
        
        const map = {};
        fetchedPlans.forEach(p => map[p.id] = p.application_name);
        setPlansMap(map);

        const meetingsRes = await getMeetings();
        setMeetings(meetingsRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch data for calendar", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchMeetingsForPlan = async (planId) => {
    try {
      setLoading(true);
      const res = await getMeetings(planId === 'All' ? null : planId);
      setMeetings(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (e) => {
    const val = e.target.value;
    setSelectedPlan(val);
    fetchMeetingsForPlan(val);
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
        <div key={`prev-${i}`} className="min-h-[120px] p-2 bg-gray-50 border border-gray-200 text-gray-400">
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

      cells.push(
        <div key={`curr-${i}`} 
             onClick={() => setSelectedDateStr(currentCellDateStr)}
             className={`min-h-[120px] p-2 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer flex flex-col ${isToday ? 'bg-blue-50' : 'bg-white'} ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
           <div className="flex justify-between items-start mb-1">
            <span className={`text-sm ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}`}>{day}</span>
            {day === 1 && <span className="text-sm font-medium text-gray-700">{monthNames[currentDate.getMonth()].substring(0, 3)}</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {dayMeetings.map(meeting => (
              <div key={meeting.id} className={`text-xs p-1.5 border rounded flex flex-col gap-1 overflow-hidden shadow-sm ${meeting.status?.toLowerCase() === 'completed' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'}`} title={`${meeting.title}\n${new Date(meeting.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}${meeting.meeting_link ? `\nLink: ${meeting.meeting_link}` : ''}`}>
                 <div className="flex items-start gap-1">
                   <span className={`w-1.5 h-1.5 mt-1 rounded-full flex-shrink-0 ${meeting.status?.toLowerCase() === 'completed' ? 'bg-gray-400' : 'bg-indigo-500'}`}></span>
                   {meeting.meeting_link ? (
                     <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="truncate font-semibold leading-tight hover:underline cursor-pointer">{meeting.title || 'KT Session'}</a>
                   ) : (
                     <span className="truncate font-semibold leading-tight">{meeting.title || 'KT Session'}</span>
                   )}
                 </div>
                 <div className="flex justify-between items-center text-[10px] text-gray-500">
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
         <div key={`next-${i}`} className="min-h-[120px] p-2 bg-gray-50 border border-gray-200 text-gray-400">
          <div className="flex justify-between items-start">
            <span className="text-sm">{i}</span>
             {i === 1 && <span className="text-sm font-medium">{monthNames[currentDate.getMonth() === 11 ? 0 : currentDate.getMonth() + 1].substring(0, 3)}</span>}
          </div>
        </div>
      );
    }

    return cells;
  };

  if (loading && plans.length === 0) return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          KT Schedule Calendar 
          {user?.name && <span className="ml-3 text-sm font-normal text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{user.name}</span>}
        </h1>
        
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 w-full md:w-auto">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter by Plan:</span>
          <select 
            value={selectedPlan}
            onChange={handlePlanChange}
            className="text-sm border-none bg-transparent focus:ring-0 cursor-pointer text-gray-800 font-medium outline-none w-full min-w-[150px]"
          >
            <option value="All">All Plans</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.application_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Calendar Main Section */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Calendar Header Controls */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="flex items-center space-x-4">
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 border border-gray-300 bg-white rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">Today</button>
              <div className="flex items-center bg-white border border-gray-300 rounded shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 border-r border-gray-300 text-gray-600 transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 text-gray-600 transition-colors"><ChevronRight size={20} /></button>
              </div>
              <h2 className="text-xl font-bold text-gray-800 ml-2 md:ml-4">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>
            
            {loading && <div className="text-sm text-gray-500 animate-pulse">Refreshing...</div>}
          </div>

          {/* Calendar Grid */}
          <div className="bg-gray-200">
             <div className="grid grid-cols-7 text-center border-b border-gray-200 bg-white">
               {dayNames.map(day => (
                 <div key={day} className="py-3 text-xs md:text-sm font-semibold text-gray-600 border-r border-gray-200 last:border-r-0">
                   <span className="hidden md:inline">{day}</span>
                   <span className="md:hidden">{day.substring(0, 3)}</span>
                 </div>
               ))}
             </div>
             <div className="grid grid-cols-7 bg-white">
               {renderCells()}
             </div>
          </div>
        </div>

        {/* Right Sidebar - Upcoming Summary */}
        <div className="w-full xl:w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit sticky top-6">
           <h3 className="font-semibold text-gray-800 mb-4 text-sm">Schedules</h3>
           
           <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
             <span className="text-sm font-medium text-gray-700">Selected Date</span>
             <div className="flex items-center border border-gray-300 rounded px-2 py-1 text-sm bg-gray-50">
               {new Date(selectedDateStr).toLocaleDateString('en-GB')} <CalendarIcon size={14} className="ml-2 text-gray-500" />
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
                 <div key={m.id} className={`border-l-4 pl-3 py-1 mb-4 ${m.status?.toLowerCase() === 'completed' ? 'border-gray-400' : 'border-indigo-500'}`} title={`${m.title || 'KT Session'}\n${new Date(m.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}${m.meeting_link ? `\nLink: ${m.meeting_link}` : ''}`}>
                   {m.meeting_link ? (
                     <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gray-800 truncate hover:underline cursor-pointer block">{m.title || 'KT Session'}</a>
                   ) : (
                     <p className="text-sm font-semibold text-gray-800 truncate">{m.title || 'KT Session'}</p>
                   )}
                   <p className="text-xs text-gray-500 mt-1 font-medium">
                     {new Date(m.scheduled_at).toLocaleDateString(undefined, {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'})} at {new Date(m.scheduled_at).toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'})}
                   </p>
                   {plansMap[m.plan_id] && (
                     <p className="text-[10px] text-gray-400 mt-1 truncate">{plansMap[m.plan_id]}</p>
                   )}
                 </div>
             ))}
             {meetings.filter(m => {
                  if(!m.scheduled_at) return false;
                  const mDate = new Date(m.scheduled_at);
                  const mDateStr = `${mDate.getUTCFullYear()}-${String(mDate.getUTCMonth() + 1).padStart(2, '0')}-${String(mDate.getUTCDate()).padStart(2, '0')}`;
                  return mDateStr === selectedDateStr;
                }).length === 0 && (
                 <p className="text-sm text-gray-500 italic text-center py-4">No schedules found for this date.</p>
             )}
           </div>

        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
