import React from 'react';

const StudyCalendar = ({ sessionHistory = [], timeRange = 30 }) => {
  // Process session history into a map of dates to card counts
  const processSessionHistory = () => {
    const dateMap = {};
    
    sessionHistory.forEach(session => {
      const dateStr = new Date(session.date).toISOString().split('T')[0];
      
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {
          date: dateStr,
          cards: 0,
          sessions: 0
        };
      }
      
      dateMap[dateStr].cards += session.answers ? session.answers.length : 0;
      dateMap[dateStr].sessions += 1;
    });
    
    return dateMap;
  };
  
  // Generate calendar data for the last N days
  const generateCalendarData = (dateMap, days) => {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the day of the week (0 = Sunday, 6 = Saturday)
    const todayDayOfWeek = today.getDay();
    
    // Calculate the starting day (to fill the current week)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - todayDayOfWeek);
    
    // Calculate number of weeks needed
    const weeksNeeded = Math.ceil((days + todayDayOfWeek) / 7);
    
    // Generate day data in a week by week format
    const weeks = [];
    
    for (let w = 0; w < weeksNeeded; w++) {
      const week = [];
      
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() - (w * 7) + d);
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = dateMap[dateStr] || { date: dateStr, cards: 0, sessions: 0 };
        
        const daysAgo = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
        
        // Only include days within the time range
        if (daysAgo <= days && daysAgo >= 0) {
          week.push({
            ...dayData,
            daysAgo,
            dayOfWeek: d,
            isToday: daysAgo === 0
          });
        } else {
          week.push(null); // Placeholder for days outside the range
        }
      }
      
      // Only add the week if it has at least one valid day
      if (week.some(day => day !== null)) {
        weeks.push(week);
      }
    }
    
    return weeks;
  };
  
  // Get date activity level (0-4)
  const getActivityLevel = (cards) => {
    if (cards === 0) return 0;
    if (cards < 10) return 1;
    if (cards < 30) return 2;
    if (cards < 60) return 3;
    return 4;
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Day labels
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Process session data
  const dateMap = processSessionHistory();
  const calendarData = generateCalendarData(dateMap, timeRange);
  
  // Check if we have any study activity
  const hasActivity = Object.values(dateMap).some(day => day.cards > 0);
  
  return (
    <div className="study-calendar">
      {/* Day labels */}
      <div className="calendar-header">
        {dayLabels.map((day) => (
          <div key={day} className="calendar-day-label">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      {hasActivity ? (
        <div className="calendar-grid">
          {calendarData.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="calendar-week">
              {/* Week label */}
              <div className="calendar-week-label">
                {weekIndex === 0 ? 'Now' : weekIndex === 4 ? `${timeRange}d` : ''}
              </div>
              
              {/* Days in week */}
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return (
                    <div 
                      key={`empty-${dayIndex}`}
                      className="calendar-day calendar-day-empty"
                    />
                  );
                }
                
                const activityLevel = getActivityLevel(day.cards);
                const dayClass = day.isToday 
                  ? 'calendar-day-today' 
                  : `calendar-day-level-${activityLevel}`;
                
                return (
                  <div 
                    key={day.date}
                    className={`calendar-day ${dayClass}`}
                  >
                    <div className="calendar-day-num">
                      {new Date(day.date).getDate()}
                    </div>
                    {day.cards > 0 && (
                      <div className="calendar-day-count">
                        {day.cards}
                      </div>
                    )}
                    <div className="calendar-day-tooltip">
                      {formatDate(day.date)}: {day.cards} cards in {day.sessions} sessions
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="calendar-no-data">
          <div className="calendar-no-data-icon">📅</div>
          <div className="calendar-no-data-title">No study activity in the last {timeRange} days</div>
          <div className="calendar-no-data-message">
            Complete quiz sessions to see your activity calendar
          </div>
        </div>
      )}
      
      {/* Legend */}
      {hasActivity && (
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--background)' }}></div>
            <span>None</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--highlight-level-1)' }}></div>
            <span>{"<10"}</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--highlight-level-2)' }}></div>
            <span>{"<30"}</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--highlight-level-3)' }}></div>
            <span>{"<60"}</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--highlight-level-4)' }}></div>
            <span>{"≥60"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyCalendar;